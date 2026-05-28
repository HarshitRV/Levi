// Pure data + selector for /sarcasm. Lives in its own module so it can be
// unit-tested without dragging the discord.js command handler into the
// test graph.

import sarcasmData from "./_sarcasm.json" with { type: "json" };

interface SarcasmEntry {
  readonly _id: string;
  readonly sarcasm: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly __v: number;
  readonly id: string;
}

// De-dupe on the way in: the source dataset has a couple of near-duplicate
// strings, and `pickQuote`'s refresh contract assumes every quote is
// distinct (see the no-duplicates test in tests/commands/sarcasm.test.ts).
export const QUOTES: readonly string[] = Array.from(
  new Set((sarcasmData as readonly SarcasmEntry[]).map((e) => e.sarcasm)),
);

/**
 * Pick a quote from {@link QUOTES}, optionally avoiding repeating `except`.
 *
 * Guarantees:
 * - Always returns a member of `QUOTES`.
 * - When `QUOTES.length > 1`, the returned value is never strictly equal
 *   to `except` — that's what lets the refresh button feel responsive.
 * - When `QUOTES.length <= 1`, returns the single quote even if it
 *   matches `except` (otherwise we'd infinite-loop).
 *
 * @param rng injectable RNG so tests can drive the path deterministically;
 *   defaults to Math.random.
 */
export function pickQuote(
  except?: string,
  rng: () => number = Math.random,
): string {
  if (QUOTES.length === 0) {
    throw new Error("QUOTES list is empty");
  }
  if (QUOTES.length === 1) return QUOTES[0]!;

  let next = QUOTES[Math.floor(rng() * QUOTES.length)]!;
  while (next === except) {
    next = QUOTES[Math.floor(rng() * QUOTES.length)]!;
  }
  return next;
}
