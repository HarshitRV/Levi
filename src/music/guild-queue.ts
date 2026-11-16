import {
  AudioPlayerStatus,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  demuxProbe,
  entersState,
  joinVoiceChannel,
  type AudioPlayer,
  type AudioResource,
  type VoiceConnection,
} from "@discordjs/voice";
import type { GuildTextBasedChannel, VoiceBasedChannel } from "discord.js";
import type { LoopMode, Track } from "../types.ts";
import { nowPlayingEmbed, trackEndedEmbed } from "../utils/embeds.ts";
import { logger, type ScopedLogger } from "../utils/logger.ts";
import { QueueState } from "./queue-state.ts";
import {
  shouldAnnounceTrackEnd,
  type TrackEndReason,
} from "./track-end-policy.ts";
import { streamTrack } from "./ytdlp.ts";

/**
 * Per-guild owner of the voice connection and audio player. Delegates all
 * queue state to a {@link QueueState} instance (tested in isolation).
 */
export class GuildQueue {
  readonly guildId: string;
  readonly voiceChannelId: string;
  textChannel: GuildTextBasedChannel | null;

  private readonly log: ScopedLogger;
  private readonly state = new QueueState();
  private readonly connection: VoiceConnection;
  private readonly player: AudioPlayer;
  private currentResource: AudioResource | null = null;
  private cleanupCurrentStream: (() => void) | null = null;
  private pendingEndReason: TrackEndReason | null = null;
  private playbackGeneration = 0;
  private notifications: Promise<void> = Promise.resolve();

  /** 0..2; 1 = 100%. Applied to AudioResource volume transformer. */
  volume = 1.0;
  paused = false;
  private destroyed = false;

  constructor(
    guildId: string,
    voiceChannel: VoiceBasedChannel,
    textChannel: GuildTextBasedChannel | null,
  ) {
    this.guildId = guildId;
    this.voiceChannelId = voiceChannel.id;
    this.textChannel = textChannel;
    this.log = logger.scope(`queue:${guildId}`);

    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    this.log.info("voice-connected", {
      channelId: voiceChannel.id,
      channelName: voiceChannel.name,
    });

    this.connection.on("stateChange", (_oldState, newState) => {
      if (
        newState.status === VoiceConnectionStatus.Disconnected ||
        newState.status === VoiceConnectionStatus.Destroyed
      ) {
        this.log.warn("voice-connection-state", { status: newState.status });
      }
    });

    // A brief download hiccup must not end the song after the default 100ms.
    this.player = createAudioPlayer({ behaviors: { maxMissedFrames: 50 } });
    this.connection.subscribe(this.player);

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy();
      }
    });

    this.player.on(AudioPlayerStatus.Idle, (oldState) => {
      if (
        "resource" in oldState &&
        oldState.resource === this.currentResource
      ) {
        void this.onPlayerIdle();
      }
    });
    this.player.on("error", (err) => {
      if (err.resource !== this.currentResource) return;
      this.log.error("player-error", { err });
      this.pendingEndReason = "error";
      // The voice library emits Idle after error; advancing here too skips tracks.
    });
    this.player.on("stateChange", (_oldState, newState) => {
      if (newState.status === AudioPlayerStatus.AutoPaused) {
        this.log.debug("player-autopaused", { reason: "no-subscriber" });
      }
    });
  }

  get current(): Track | null {
    return this.state.current;
  }
  get isDestroyed(): boolean {
    return this.destroyed;
  }
  get upcoming(): readonly Track[] {
    return this.state.upcoming;
  }
  get history(): readonly Track[] {
    return this.state.history;
  }
  get loopMode(): LoopMode {
    return this.state.loopMode;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get canPrevious(): boolean {
    return this.history.length > 0;
  }

  get canSkip(): boolean {
    return this.current !== null;
  }

  get canShuffle(): boolean {
    return this.upcoming.length >= 2;
  }

  isEmpty(): boolean {
    return this.state.isEmpty();
  }

  enqueue(track: Track): number {
    return this.state.enqueue(track);
  }

  enqueueMany(tracks: Track[]): void {
    this.state.enqueueMany(tracks);
  }

  /** Start playing if idle. Safe to call repeatedly. */
  async ensurePlaying(): Promise<void> {
    if (this.state.current !== null) return;
    await this.advanceAndPlay();
  }

  pause(): boolean {
    if (this.paused) return false;
    this.paused = this.player.pause(true);
    if (this.paused) {
      this.log.info("paused", { title: this.state.current?.title ?? null });
    }
    return this.paused;
  }

  resume(): boolean {
    if (!this.paused) return false;
    const ok = this.player.unpause();
    if (ok) {
      this.paused = false;
      this.log.info("resumed", { title: this.state.current?.title ?? null });
    }
    return ok;
  }

  skip(): Track | null {
    const skipped = this.state.requestSkip();
    if (skipped === null) return null;
    this.pendingEndReason = "skipped";
    this.log.info("skipped", { title: skipped.title });
    if (!this.player.stop(true)) void this.onPlayerIdle();
    return skipped;
  }

  previous(): boolean {
    if (!this.state.requestPrevious()) return false;
    this.pendingEndReason = "skipped";
    this.log.info("previous", { title: this.state.current?.title ?? null });
    if (this.state.current !== null) {
      if (!this.player.stop(true)) void this.onPlayerIdle();
    } else {
      void this.advanceAndPlay();
    }
    return true;
  }

  shuffle(): void {
    this.state.shuffle();
    this.log.info("shuffled", { upcomingCount: this.state.upcoming.length });
  }

  removeAt(index: number): Track | null {
    return this.state.removeAt(index);
  }

  clearUpcoming(): number {
    const removed = this.state.clearUpcoming();
    if (removed > 0) {
      this.log.info("queue-cleared", { removed });
    }
    return removed;
  }

  setLoop(mode: LoopMode): void {
    this.state.setLoop(mode);
  }

  setVolume(vol: number): number {
    const clamped = Math.max(0, Math.min(2, vol));
    this.volume = clamped;
    this.currentResource?.volume?.setVolume(clamped);
    this.log.info("volume-changed", { volume: clamped });
    return clamped;
  }

  /** Returns playback position into the current track, in seconds. */
  playbackPositionSec(): number {
    const ms = this.currentResource?.playbackDuration ?? 0;
    return Math.floor(ms / 1000);
  }

  /** Hard-stop and disconnect. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.playbackGeneration++;
    this.pendingEndReason = "stopped";
    this.cleanupCurrentStream?.();
    this.cleanupCurrentStream = null;
    this.state.current = null;
    this.state.clearUpcoming();
    this.log.info("stopped", {});
    this.log.info("voice-disconnected", { channelId: this.voiceChannelId });
    try {
      this.player.stop(true);
    } catch {}
    try {
      this.connection.destroy();
    } catch {}
  }

  private async advanceAndPlay(): Promise<void> {
    if (this.destroyed) return;
    const next = this.state.advance();
    if (next === null) return;
    await this.playCurrent(next);
  }

  private async playCurrent(track: Track): Promise<void> {
    const generation = ++this.playbackGeneration;
    const startedAt = Date.now();
    this.cleanupCurrentStream?.();
    this.pendingEndReason = null;

    try {
      const { stream, ready, cleanup } = streamTrack(track.url);
      this.cleanupCurrentStream = cleanup;
      await Promise.all([
        ready,
        entersState(this.connection, VoiceConnectionStatus.Ready, 20_000),
      ]);
      if (this.destroyed || generation !== this.playbackGeneration) return;
      const probed = await demuxProbe(stream);
      if (this.destroyed || generation !== this.playbackGeneration) return;

      // Recognized WebM/Ogg Opus uses native decoding instead of an FFmpeg process.
      // Keep inline volume so existing mid-track volume controls still work.
      const resource = createAudioResource(probed.stream, {
        inputType: probed.type,
        inlineVolume: true,
        metadata: track,
      });
      resource.volume?.setVolume(this.volume);
      this.currentResource = resource;
      this.log.debug("audio-resource-created", {
        title: track.title,
        url: track.url,
      });
      this.player.play(resource);
      await entersState(this.player, AudioPlayerStatus.Playing, 15_000);
      if (this.destroyed || generation !== this.playbackGeneration) return;
      this.log.info("track-started", {
        title: track.title,
        url: track.url,
        requestedBy: track.requestedByName,
        durationSec: track.durationSec,
        startupMs: Date.now() - startedAt,
        inputType: probed.type,
      });

      this.notify(nowPlayingEmbed(track));
    } catch (err) {
      if (this.destroyed || generation !== this.playbackGeneration) return;
      this.log.error("playback-failed", { title: track.title, err });
      this.pendingEndReason = "error";
      void this.onPlayerIdle();
    }
  }

  private async onPlayerIdle(): Promise<void> {
    if (this.destroyed || this.state.current === null) return;
    this.playbackGeneration++;

    const finished = this.state.current;
    const reason = this.pendingEndReason ?? "finished";
    this.pendingEndReason = null;

    this.cleanupCurrentStream?.();
    this.cleanupCurrentStream = null;
    this.currentResource = null;
    this.paused = false;
    this.player.stop(true);

    if (finished !== null) {
      this.log.info("track-ended", { title: finished.title, reason });
    }

    // Preserve message ordering without delaying the next song on Discord REST.
    if (
      finished !== null &&
      this.textChannel &&
      shouldAnnounceTrackEnd({
        reason,
        loopMode: this.state.loopMode,
        hasFinishedTrack: true,
        hasTextChannel: true,
      })
    ) {
      this.notify(trackEndedEmbed(finished));
    }

    // Failed tracks must not retry forever when loop mode is enabled.
    this.state.onTrackEnded(reason === "error");
    await this.advanceAndPlay();
  }

  private notify(embed: ReturnType<typeof nowPlayingEmbed>): void {
    const channel = this.textChannel;
    if (!channel) return;
    this.notifications = this.notifications
      .then(async () => {
        if (!this.destroyed) await channel.send({ embeds: [embed] });
      })
      .catch((err) => this.log.warn("notification-failed", { err }));
  }
}
