import {
  AudioPlayerStatus,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  type AudioPlayer,
  type AudioResource,
  type VoiceConnection,
} from "@discordjs/voice";
import type { GuildTextBasedChannel, VoiceBasedChannel } from "discord.js";
import type { LoopMode, Track } from "../types.ts";
import { nowPlayingEmbed } from "../utils/embeds.ts";
import { QueueState } from "./queue-state.ts";
import { streamTrack } from "./ytdlp.ts";

/**
 * Per-guild owner of the voice connection and audio player. Delegates all
 * queue state to a {@link QueueState} instance (tested in isolation).
 */
export class GuildQueue {
  readonly guildId: string;
  readonly voiceChannelId: string;
  textChannel: GuildTextBasedChannel | null;

  private readonly state = new QueueState();
  private readonly connection: VoiceConnection;
  private readonly player: AudioPlayer;
  private currentResource: AudioResource | null = null;
  private cleanupCurrentStream: (() => void) | null = null;

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

    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    this.player = createAudioPlayer();
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

    this.player.on(AudioPlayerStatus.Idle, () => {
      void this.onPlayerIdle();
    });
    this.player.on("error", (err) => {
      console.error(`[guild ${this.guildId}] player error`, err);
      void this.onPlayerIdle();
    });
  }

  get current(): Track | null {
    return this.state.current;
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
    return this.paused;
  }

  resume(): boolean {
    if (!this.paused) return false;
    const ok = this.player.unpause();
    if (ok) this.paused = false;
    return ok;
  }

  skip(): Track | null {
    const skipped = this.state.requestSkip();
    if (skipped === null) return null;
    this.player.stop(true);
    return skipped;
  }

  previous(): boolean {
    if (!this.state.requestPrevious()) return false;
    // If something is currently playing, stopping the player triggers the
    // idle handler which advances to the rewound track. Otherwise we have to
    // kick playback off ourselves.
    if (this.state.current !== null) {
      this.player.stop(true);
    } else {
      void this.advanceAndPlay();
    }
    return true;
  }

  shuffle(): void {
    this.state.shuffle();
  }

  removeAt(index: number): Track | null {
    return this.state.removeAt(index);
  }

  clearUpcoming(): number {
    return this.state.clearUpcoming();
  }

  setLoop(mode: LoopMode): void {
    this.state.setLoop(mode);
  }

  setVolume(vol: number): number {
    const clamped = Math.max(0, Math.min(2, vol));
    this.volume = clamped;
    this.currentResource?.volume?.setVolume(clamped);
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
    this.cleanupCurrentStream?.();
    this.cleanupCurrentStream = null;
    this.state.current = null;
    this.state.clearUpcoming();
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
    this.cleanupCurrentStream?.();

    const { stream, cleanup } = streamTrack(track.url);
    this.cleanupCurrentStream = cleanup;

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true,
      metadata: track,
    });
    resource.volume?.setVolume(this.volume);
    this.currentResource = resource;
    this.player.play(resource);

    if (this.textChannel) {
      try {
        await this.textChannel.send({ embeds: [nowPlayingEmbed(track)] });
      } catch {}
    }
  }

  private async onPlayerIdle(): Promise<void> {
    if (this.destroyed) return;

    this.cleanupCurrentStream?.();
    this.cleanupCurrentStream = null;
    this.currentResource = null;

    this.state.onTrackEnded();
    await this.advanceAndPlay();
  }
}
