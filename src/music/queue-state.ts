import type { LoopMode, Track } from "../types.ts";

export interface QueueStateOptions {
  /**
   * Pluggable RNG so shuffle can be made deterministic in tests.
   * Must return values in [0, 1). Defaults to `Math.random`.
   */
  rng?: () => number;
}

/**
 * Pure state machine for one guild's music queue. No voice, no I/O.
 *
 * The lifecycle is driven by two events:
 *  - {@link advance} — called when the player is idle and we want the next
 *    track to become {@link current}.
 *  - {@link onTrackEnded} — called once the previously playing track finishes
 *    (or is stopped). Decides what to do with the finished track based on
 *    loop mode and the skip/rewind flags.
 *
 * `requestSkip` / `requestPrevious` only update flags; the host (GuildQueue)
 * is responsible for actually stopping the player so the idle handler fires.
 */
export class QueueState {
  current: Track | null = null;
  upcoming: Track[] = [];
  history: Track[] = [];
  loopMode: LoopMode = "off";

  private skipRequested = false;
  private rewindRequested = false;
  private readonly rng: () => number;

  constructor(opts: QueueStateOptions = {}) {
    this.rng = opts.rng ?? Math.random;
  }

  isEmpty(): boolean {
    return this.current === null && this.upcoming.length === 0;
  }

  /**
   * Add a track. Returns its position: `0` if it will play immediately
   * (queue was empty), otherwise its 1-based index in the upcoming list.
   */
  enqueue(track: Track): number {
    this.upcoming.push(track);
    return this.current === null ? 0 : this.upcoming.length;
  }

  enqueueMany(tracks: Track[]): void {
    this.upcoming.push(...tracks);
  }

  setLoop(mode: LoopMode): void {
    this.loopMode = mode;
  }

  /**
   * Mark a skip and return the track that was playing. The host should
   * stop the player so {@link onTrackEnded} fires.
   */
  requestSkip(): Track | null {
    if (this.current === null) return null;
    this.skipRequested = true;
    return this.current;
  }

  /**
   * Rewind to the previous track. Returns `false` if history is empty.
   *
   * Re-queues the popped history entry at the front of upcoming. If a
   * track is currently playing, it is pushed in right behind so that
   * chaining `/previous` keeps walking backward through history.
   */
  requestPrevious(): boolean {
    const prev = this.history.pop();
    if (prev === undefined) return false;
    if (this.current !== null) this.upcoming.unshift(this.current);
    this.upcoming.unshift(prev);
    this.rewindRequested = true;
    this.skipRequested = true;
    return true;
  }

  /** Fisher-Yates over the upcoming list using the injected RNG. */
  shuffle(): void {
    for (let i = this.upcoming.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const a = this.upcoming[i];
      const b = this.upcoming[j];
      if (a === undefined || b === undefined) continue;
      this.upcoming[i] = b;
      this.upcoming[j] = a;
    }
  }

  removeAt(index: number): Track | null {
    if (index < 0 || index >= this.upcoming.length) return null;
    const [removed] = this.upcoming.splice(index, 1);
    return removed ?? null;
  }

  clearUpcoming(): number {
    const count = this.upcoming.length;
    this.upcoming = [];
    return count;
  }

  /**
   * Move the next upcoming track into {@link current}. Returns the new
   * current track, or `null` if nothing is left.
   */
  advance(): Track | null {
    this.current = this.upcoming.shift() ?? null;
    return this.current;
  }

  /**
   * Called after the player stops the current track. Mutates state based
   * on loop mode and the skip/rewind flags, then clears those flags and
   * sets `current` to null. The host should then call {@link advance}.
   */
  onTrackEnded(): void {
    const finished = this.current;
    const skipped = this.skipRequested;
    const rewinding = this.rewindRequested;
    this.skipRequested = false;
    this.rewindRequested = false;

    if (finished !== null && !rewinding) {
      if (!skipped && this.loopMode === "track") {
        // Repeat: re-queue the finished track at the front.
        this.upcoming.unshift(finished);
      } else if (this.loopMode === "queue") {
        // Cycle: push to the end, and also record in history so /previous
        // can walk through past plays.
        this.upcoming.push(finished);
        this.history.push(finished);
      } else {
        this.history.push(finished);
      }
    }

    this.current = null;
  }
}
