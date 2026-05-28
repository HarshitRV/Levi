import type { LoopMode } from "../types.ts";

/**
 * Why the audio player went idle. The host (GuildQueue) determines this from
 * the most recent control action (`pendingEndReason`) — natural completion
 * is the default when no action set the flag.
 */
export type TrackEndReason = "finished" | "skipped" | "error" | "stopped";

export interface ShouldAnnounceTrackEndArgs {
  reason: TrackEndReason;
  loopMode: LoopMode;
  /** A track was actually playing (vs. idle->idle false alarms). */
  hasFinishedTrack: boolean;
  /** The guild has a text channel to post into. */
  hasTextChannel: boolean;
}

/**
 * Decides whether to post a "Track ended" embed to the guild's text channel.
 *
 * Pure predicate so the policy is exercised in unit tests without spinning
 * up a voice connection. Behavior matrix:
 *
 * | reason   | loopMode | result |
 * |----------|----------|--------|
 * | finished | off      | true   |
 * | finished | queue    | true   |
 * | finished | track    | false  | (would ping-pong with re-play)
 * | skipped  | *        | false  | (command reply handles UX)
 * | stopped  | *        | false  | (bot is leaving)
 * | error    | *        | false  | (logged separately as playback-failed)
 *
 * Always false when there is no finished track or no text channel.
 */
export function shouldAnnounceTrackEnd(
  args: ShouldAnnounceTrackEndArgs,
): boolean {
  if (!args.hasFinishedTrack || !args.hasTextChannel) return false;
  if (args.reason !== "finished") return false;
  if (args.loopMode === "track") return false;
  return true;
}
