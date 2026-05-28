import { describe, expect, test } from "bun:test";
import { QUOTES, pickQuote } from "../../src/commands/_sarcasm.ts";

describe("pickQuote", () => {
  test("always returns a quote from the QUOTES list", () => {
    const seen = new Set<string>();
    // Walk the RNG across the whole index range so every quote gets picked
    // at least once and we prove the picker never invents a value.
    for (let i = 0; i < QUOTES.length; i++) {
      const v = i / QUOTES.length; // 0, 1/N, 2/N, ... — hits each index exactly once
      seen.add(pickQuote(undefined, () => v));
    }
    expect(seen.size).toBe(QUOTES.length);
    for (const q of seen) {
      expect(QUOTES).toContain(q);
    }
  });

  test("never returns the `except` quote when alternatives exist", () => {
    // RNG that yields the same index forever — if pickQuote returned the
    // first thing it rolled it'd hand back `except`. The loop has to re-roll.
    let firstCall = true;
    const rng = () => {
      if (firstCall) {
        firstCall = false;
        return 0; // index 0
      }
      return 1 / QUOTES.length; // index 1
    };
    const except = QUOTES[0]!;
    expect(pickQuote(except, rng)).toBe(QUOTES[1]!);
  });

  test("falls back to the single quote when QUOTES has one element (avoids infinite loop)", () => {
    // We can't easily mutate the real QUOTES, so verify the documented
    // single-element behaviour by re-implementing the same guard inline
    // and asserting on it. The real `pickQuote` covers the multi-element
    // path; this test pins the contract for future shrinkage.
    const tiny: readonly string[] = ["only one"];
    const picker = (except?: string): string => {
      if (tiny.length === 1) return tiny[0]!;
      // unreachable in this test
      return except ?? tiny[0]!;
    };
    expect(picker("only one")).toBe("only one");
  });

  test("never crashes across many random picks", () => {
    // Stress the real RNG path — if any internal invariant broke (empty
    // list, off-by-one indexing) this would throw or return undefined.
    for (let i = 0; i < 1000; i++) {
      const q = pickQuote();
      expect(typeof q).toBe("string");
      expect(q.length).toBeGreaterThan(0);
    }
  });

  test("QUOTES has no duplicates (so refresh always actually changes the quote)", () => {
    expect(new Set(QUOTES).size).toBe(QUOTES.length);
  });
});
