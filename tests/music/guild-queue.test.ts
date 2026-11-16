import type { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { beforeEach, expect, test, vi } from "vitest";
import type { GuildTextBasedChannel, VoiceBasedChannel } from "discord.js";

type Resource = { metadata: { title: string } };
type Player = EventEmitter & {
  state: { status: string; resource: Resource | null };
  play(resource: Resource): void;
  stop(): boolean;
};
const mocks = vi.hoisted(() => ({
  streamTrack: vi.fn(),
  players: [] as Player[],
}));
vi.mock("../../src/music/ytdlp.ts", () => ({ streamTrack: mocks.streamTrack }));
vi.mock("@discordjs/voice", async () => {
  const { EventEmitter } = await import("node:events");
  return {
    AudioPlayerStatus: {
      Idle: "idle",
      Playing: "playing",
      AutoPaused: "autopaused",
    },
    VoiceConnectionStatus: {
      Ready: "ready",
      Disconnected: "disconnected",
      Destroyed: "destroyed",
      Signalling: "signalling",
      Connecting: "connecting",
    },
    joinVoiceChannel: () =>
      Object.assign(new EventEmitter(), { subscribe() {}, destroy() {} }),
    entersState: async () => {},
    demuxProbe: async (stream: PassThrough) => ({ stream, type: "webm/opus" }),
    createAudioResource: (
      _stream: PassThrough,
      options: { metadata: unknown },
    ) => ({
      metadata: options.metadata,
      volume: { setVolume() {} },
      playbackDuration: 0,
    }),
    createAudioPlayer: () => {
      const player = Object.assign(new EventEmitter(), {
        state: { status: "idle", resource: null as Resource | null },
        play(resource: Resource) {
          this.state = { status: "playing", resource };
        },
        stop(this: Player) {
          if (this.state.status === "idle") return false;
          const old = this.state;
          this.state = { status: "idle", resource: null };
          this.emit("idle", old);
          return true;
        },
      });
      mocks.players.push(player);
      return player;
    },
  };
});

import { GuildQueue } from "../../src/music/guild-queue.ts";
const channel = {
  id: "voice",
  name: "voice",
  guild: { voiceAdapterCreator: {} },
} as unknown as VoiceBasedChannel;
const track = (title: string) => ({
  title,
  url: title,
  durationSec: 10,
  thumbnail: null,
  requestedBy: "test",
  requestedByName: "test",
});
const tick = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  mocks.players.length = 0;
  mocks.streamTrack.mockReset().mockImplementation(() => ({
    stream: new PassThrough(),
    ready: Promise.resolve(),
    cleanup: vi.fn(),
  }));
});

test("an error followed by Idle advances exactly one track", async () => {
  const q = new GuildQueue("guild", channel, null);
  q.enqueueMany([track("a"), track("b"), track("c")]);
  await q.ensurePlaying();
  const p = mocks.players[0]!;
  p.emit("error", { resource: p.state.resource });
  p.stop();
  await tick();
  expect(q.current?.title).toBe("b");
  expect(q.upcoming.map((t) => t.title)).toEqual(["c"]);
  q.destroy();
});

test("skip while downloading cancels startup without playing the stale track", async () => {
  let release!: () => void;
  const cleanup = vi.fn();
  mocks.streamTrack.mockImplementationOnce(() => ({
    stream: new PassThrough(),
    ready: new Promise<void>((resolve) => {
      release = resolve;
    }),
    cleanup,
  }));
  const q = new GuildQueue("guild", channel, null);
  q.enqueueMany([track("a"), track("b")]);
  const first = q.ensurePlaying();
  q.skip();
  release();
  await first;
  await tick();
  expect(cleanup).toHaveBeenCalled();
  expect(mocks.players[0]!.state.resource!.metadata.title).toBe("b");
  q.destroy();
});

test("slow Discord notifications do not hold up playback or the next song", async () => {
  const text = {
    send: vi.fn(() => new Promise(() => {})),
  } as unknown as GuildTextBasedChannel;
  const q = new GuildQueue("guild", channel, text);
  q.enqueueMany([track("a"), track("b")]);
  await q.ensurePlaying();
  mocks.players[0]!.stop();
  await tick();
  expect(mocks.players[0]!.state.resource!.metadata.title).toBe("b");
  q.destroy();
});

test("events from an old resource cannot end the new song", async () => {
  const q = new GuildQueue("guild", channel, null);
  q.enqueueMany([track("a"), track("b"), track("c")]);
  await q.ensurePlaying();
  const p = mocks.players[0]!;
  const old = p.state;
  p.stop();
  await tick();
  p.emit("idle", old);
  await tick();
  expect(q.current?.title).toBe("b");
  q.destroy();
});
