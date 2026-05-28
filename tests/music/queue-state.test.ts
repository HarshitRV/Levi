import { beforeEach, describe, expect, test } from "vitest";
import { QueueState } from "../../src/music/queue-state.ts";
import type { Track } from "../../src/types.ts";

function makeTrack(id: string, overrides: Partial<Track> = {}): Track {
  return {
    url: `https://example.test/${id}`,
    title: `track-${id}`,
    durationSec: 180,
    thumbnail: null,
    requestedBy: "tester",
    requestedByName: "Tester",
    ...overrides,
  };
}

/** Returns track titles in order. Makes assertions readable. */
function titles(tracks: readonly Track[] | Track[] | null): string[] {
  if (tracks === null) return [];
  return tracks.map((t) => t.title);
}

/**
 * Deterministic RNG factory. `values` is a tape of [0,1) numbers the RNG will
 * yield in order. Once exhausted it stays at the last value. Lets us drive
 * Fisher-Yates to a known permutation.
 */
function tapeRng(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)] ?? 0;
}

describe("QueueState · enqueue and basic shape", () => {
  let q: QueueState;
  beforeEach(() => {
    q = new QueueState();
  });

  test("starts empty", () => {
    expect(q.isEmpty()).toBe(true);
    expect(q.current).toBeNull();
    expect(q.upcoming).toEqual([]);
    expect(q.history).toEqual([]);
    expect(q.loopMode).toBe("off");
  });

  test("first enqueue reports position 0 (will play immediately)", () => {
    expect(q.enqueue(makeTrack("a"))).toBe(0);
  });

  test("subsequent enqueues return their 1-based upcoming index", () => {
    q.advance(); // empty advance leaves current null
    q.enqueue(makeTrack("a")); // position 0
    q.advance(); // a becomes current
    expect(q.current?.title).toBe("track-a");
    expect(q.enqueue(makeTrack("b"))).toBe(1);
    expect(q.enqueue(makeTrack("c"))).toBe(2);
  });

  test("enqueueMany appends in order", () => {
    q.enqueueMany([makeTrack("a"), makeTrack("b"), makeTrack("c")]);
    expect(titles(q.upcoming)).toEqual(["track-a", "track-b", "track-c"]);
  });
});

describe("QueueState · advance", () => {
  test("advance on empty queue keeps current null", () => {
    const q = new QueueState();
    expect(q.advance()).toBeNull();
    expect(q.current).toBeNull();
  });

  test("advance moves the head of upcoming into current", () => {
    const q = new QueueState();
    q.enqueueMany([makeTrack("a"), makeTrack("b")]);
    expect(q.advance()?.title).toBe("track-a");
    expect(q.current?.title).toBe("track-a");
    expect(titles(q.upcoming)).toEqual(["track-b"]);
  });
});

describe("QueueState · onTrackEnded loop modes", () => {
  let q: QueueState;
  beforeEach(() => {
    q = new QueueState();
    q.enqueueMany([makeTrack("a"), makeTrack("b"), makeTrack("c")]);
    q.advance(); // current = a
  });

  test("loop=off: finished track goes to history, next plays", () => {
    q.setLoop("off");
    q.onTrackEnded();
    expect(titles(q.history)).toEqual(["track-a"]);
    expect(q.current).toBeNull();
    expect(titles(q.upcoming)).toEqual(["track-b", "track-c"]);

    q.advance();
    expect(q.current?.title).toBe("track-b");
  });

  test("loop=track: finished track is re-queued at the front", () => {
    q.setLoop("track");
    q.onTrackEnded();
    expect(q.history).toEqual([]);
    expect(titles(q.upcoming)).toEqual(["track-a", "track-b", "track-c"]);

    q.advance();
    expect(q.current?.title).toBe("track-a");
  });

  test("loop=queue: finished track cycles to the end and is recorded in history", () => {
    q.setLoop("queue");
    q.onTrackEnded();
    expect(titles(q.history)).toEqual(["track-a"]);
    expect(titles(q.upcoming)).toEqual(["track-b", "track-c", "track-a"]);

    q.advance();
    expect(q.current?.title).toBe("track-b");
  });

  test("onTrackEnded with current=null is a no-op", () => {
    const empty = new QueueState();
    empty.onTrackEnded();
    expect(empty.history).toEqual([]);
    expect(empty.current).toBeNull();
  });
});

describe("QueueState · requestSkip", () => {
  test("returns null when nothing is playing", () => {
    const q = new QueueState();
    expect(q.requestSkip()).toBeNull();
  });

  test("returns the current track without mutating it yet", () => {
    const q = new QueueState();
    q.enqueue(makeTrack("a"));
    q.advance();
    expect(q.requestSkip()?.title).toBe("track-a");
    expect(q.current?.title).toBe("track-a");
  });

  test("skip in loop=track bypasses the repeat and moves to next", () => {
    const q = new QueueState();
    q.enqueueMany([makeTrack("a"), makeTrack("b")]);
    q.advance(); // current=a
    q.setLoop("track");
    q.requestSkip();
    q.onTrackEnded();
    // The skipped track is NOT re-queued at the front even in track-loop.
    expect(titles(q.upcoming)).toEqual(["track-b"]);
    expect(titles(q.history)).toEqual(["track-a"]);
  });

  test("skip in loop=queue still appends finished to the end", () => {
    const q = new QueueState();
    q.enqueueMany([makeTrack("a"), makeTrack("b")]);
    q.advance();
    q.setLoop("queue");
    q.requestSkip();
    q.onTrackEnded();
    expect(titles(q.upcoming)).toEqual(["track-b", "track-a"]);
  });

  test("skip flag only fires once (does not affect subsequent track endings)", () => {
    const q = new QueueState();
    q.enqueueMany([makeTrack("a"), makeTrack("b")]);
    q.advance(); // current=a
    q.setLoop("track");
    q.requestSkip();
    q.onTrackEnded(); // a was skipped, b becomes head
    q.advance(); // current=b
    q.onTrackEnded(); // no skip this time; track-loop should re-queue b
    expect(titles(q.upcoming)).toEqual(["track-b"]);
  });
});

describe("QueueState · requestPrevious", () => {
  test("returns false when history is empty", () => {
    const q = new QueueState();
    q.enqueue(makeTrack("a"));
    q.advance();
    expect(q.requestPrevious()).toBe(false);
    expect(q.current?.title).toBe("track-a");
  });

  test("rewinds: prev goes to front of upcoming followed by current", () => {
    const q = new QueueState();
    q.enqueueMany([makeTrack("a"), makeTrack("b")]);
    q.advance(); // current=a
    q.onTrackEnded(); // a -> history
    q.advance(); // current=b
    expect(titles(q.history)).toEqual(["track-a"]);

    expect(q.requestPrevious()).toBe(true);
    expect(titles(q.upcoming)).toEqual(["track-a", "track-b"]);
    expect(q.history).toEqual([]);
  });

  test("rewind handler does not re-record the finished track in history", () => {
    const q = new QueueState();
    q.enqueueMany([makeTrack("a"), makeTrack("b")]);
    q.advance(); // current=a
    q.onTrackEnded(); // a -> history
    q.advance(); // current=b
    q.requestPrevious();

    // Simulate the player going idle: onTrackEnded should NOT push `b` back
    // into history (otherwise /previous twice would loop).
    q.onTrackEnded();
    expect(titles(q.history)).toEqual([]);
    expect(titles(q.upcoming)).toEqual(["track-a", "track-b"]);

    q.advance();
    expect(q.current?.title).toBe("track-a");
  });

  test("chained previous walks further back through history", () => {
    const q = new QueueState();
    q.enqueueMany([makeTrack("a"), makeTrack("b"), makeTrack("c")]);
    // Play through a, b, then onto c.
    q.advance(); // a
    q.onTrackEnded(); // a→history
    q.advance(); // b
    q.onTrackEnded(); // b→history
    q.advance(); // c
    expect(titles(q.history)).toEqual(["track-a", "track-b"]);
    expect(q.current?.title).toBe("track-c");

    // /previous → b
    expect(q.requestPrevious()).toBe(true);
    q.onTrackEnded();
    q.advance();
    expect(q.current?.title).toBe("track-b");
    expect(titles(q.history)).toEqual(["track-a"]);

    // /previous → a
    expect(q.requestPrevious()).toBe(true);
    q.onTrackEnded();
    q.advance();
    expect(q.current?.title).toBe("track-a");
    expect(titles(q.history)).toEqual([]);

    // No more history.
    expect(q.requestPrevious()).toBe(false);
  });

  test("previous when nothing is currently playing still queues the prev track", () => {
    const q = new QueueState();
    q.enqueue(makeTrack("a"));
    q.advance(); // current=a
    q.onTrackEnded(); // a→history, current=null
    expect(q.current).toBeNull();
    expect(q.requestPrevious()).toBe(true);
    expect(titles(q.upcoming)).toEqual(["track-a"]);
  });
});

describe("QueueState · shuffle", () => {
  test("does not change the multiset of tracks", () => {
    const q = new QueueState();
    const before = ["a", "b", "c", "d", "e"].map((id) => makeTrack(id));
    q.enqueueMany(before);
    q.shuffle();
    const beforeTitles = before.map((t) => t.title).sort();
    const afterTitles = q.upcoming.map((t) => t.title).sort();
    expect(afterTitles).toEqual(beforeTitles);
  });

  test("is deterministic with an injected RNG", () => {
    const tracks = ["a", "b", "c", "d"].map((id) => makeTrack(id));
    const q1 = new QueueState({ rng: tapeRng([0.1, 0.2, 0.3]) });
    const q2 = new QueueState({ rng: tapeRng([0.1, 0.2, 0.3]) });
    q1.enqueueMany(tracks);
    q2.enqueueMany(tracks);
    q1.shuffle();
    q2.shuffle();
    expect(titles(q1.upcoming)).toEqual(titles(q2.upcoming));
  });

  test("is a no-op for 0 or 1 element queues", () => {
    const empty = new QueueState();
    empty.shuffle();
    expect(empty.upcoming).toEqual([]);

    const one = new QueueState();
    one.enqueue(makeTrack("a"));
    one.shuffle();
    expect(titles(one.upcoming)).toEqual(["track-a"]);
  });
});

describe("QueueState · removeAt and clearUpcoming", () => {
  test("removeAt removes and returns the track at the given index", () => {
    const q = new QueueState();
    q.enqueueMany([makeTrack("a"), makeTrack("b"), makeTrack("c")]);
    expect(q.removeAt(1)?.title).toBe("track-b");
    expect(titles(q.upcoming)).toEqual(["track-a", "track-c"]);
  });

  test("removeAt out-of-range returns null and does not mutate", () => {
    const q = new QueueState();
    q.enqueueMany([makeTrack("a")]);
    expect(q.removeAt(-1)).toBeNull();
    expect(q.removeAt(5)).toBeNull();
    expect(titles(q.upcoming)).toEqual(["track-a"]);
  });

  test("clearUpcoming returns the cleared count and empties the queue", () => {
    const q = new QueueState();
    q.enqueueMany([makeTrack("a"), makeTrack("b")]);
    expect(q.clearUpcoming()).toBe(2);
    expect(q.upcoming).toEqual([]);
  });

  test("clearUpcoming does not touch the currently playing track", () => {
    const q = new QueueState();
    q.enqueueMany([makeTrack("a"), makeTrack("b")]);
    q.advance(); // current=a
    q.clearUpcoming();
    expect(q.current?.title).toBe("track-a");
    expect(q.upcoming).toEqual([]);
  });
});
