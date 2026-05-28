import { describe, expect, test } from "vitest";
import {
  shouldAnnounceTrackEnd,
  type TrackEndReason,
} from "../../src/music/track-end-policy.ts";
import type { LoopMode } from "../../src/types.ts";

/** Builds args with sane defaults so each test only spells out the deltas. */
function args(
  overrides: {
    reason?: TrackEndReason;
    loopMode?: LoopMode;
    hasFinishedTrack?: boolean;
    hasTextChannel?: boolean;
  } = {},
) {
  return {
    reason: overrides.reason ?? "finished",
    loopMode: overrides.loopMode ?? "off",
    hasFinishedTrack: overrides.hasFinishedTrack ?? true,
    hasTextChannel: overrides.hasTextChannel ?? true,
  } as const;
}

describe("shouldAnnounceTrackEnd · reason × loopMode matrix", () => {
  const loopModes: LoopMode[] = ["off", "track", "queue"];

  test("reason=finished + loop=off → announce", () => {
    expect(
      shouldAnnounceTrackEnd(args({ reason: "finished", loopMode: "off" })),
    ).toBe(true);
  });

  test("reason=finished + loop=queue → announce (track really ended; will replay later)", () => {
    expect(
      shouldAnnounceTrackEnd(args({ reason: "finished", loopMode: "queue" })),
    ).toBe(true);
  });

  test("reason=finished + loop=track → suppress (would ping-pong with re-play)", () => {
    expect(
      shouldAnnounceTrackEnd(args({ reason: "finished", loopMode: "track" })),
    ).toBe(false);
  });

  test("reason=skipped → suppress for every loop mode (command reply handles UX)", () => {
    for (const loopMode of loopModes) {
      expect(
        shouldAnnounceTrackEnd(args({ reason: "skipped", loopMode })),
      ).toBe(false);
    }
  });

  test("reason=stopped → suppress for every loop mode (bot is leaving)", () => {
    for (const loopMode of loopModes) {
      expect(
        shouldAnnounceTrackEnd(args({ reason: "stopped", loopMode })),
      ).toBe(false);
    }
  });

  test("reason=error → suppress for every loop mode (logged separately)", () => {
    for (const loopMode of loopModes) {
      expect(shouldAnnounceTrackEnd(args({ reason: "error", loopMode }))).toBe(
        false,
      );
    }
  });
});

describe("shouldAnnounceTrackEnd · pre-conditions", () => {
  test("returns false when no track was actually playing", () => {
    expect(shouldAnnounceTrackEnd(args({ hasFinishedTrack: false }))).toBe(
      false,
    );
  });

  test("returns false when the guild has no text channel to post into", () => {
    expect(shouldAnnounceTrackEnd(args({ hasTextChannel: false }))).toBe(false);
  });

  test("pre-conditions short-circuit ahead of reason/loopMode", () => {
    // Even on the happiest path (finished + off), missing inputs win.
    expect(
      shouldAnnounceTrackEnd(
        args({
          reason: "finished",
          loopMode: "off",
          hasFinishedTrack: false,
        }),
      ),
    ).toBe(false);
    expect(
      shouldAnnounceTrackEnd(
        args({
          reason: "finished",
          loopMode: "off",
          hasTextChannel: false,
        }),
      ),
    ).toBe(false);
  });
});
