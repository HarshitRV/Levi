import { describe, expect, test } from "vitest";
import {
  formatDuration,
  progressBar,
  truncate,
} from "../../src/utils/format.ts";

describe("formatDuration", () => {
  test("returns LIVE for non-positive or non-finite input", () => {
    expect(formatDuration(0)).toBe("LIVE");
    expect(formatDuration(-1)).toBe("LIVE");
    expect(formatDuration(Number.NaN)).toBe("LIVE");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("LIVE");
  });

  test("formats sub-hour durations as M:SS", () => {
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(45)).toBe("0:45");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(213)).toBe("3:33");
  });

  test("formats one-hour-plus durations as H:MM:SS", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(36_000)).toBe("10:00:00");
  });

  test("floors fractional seconds", () => {
    expect(formatDuration(59.9)).toBe("0:59");
  });
});

describe("truncate", () => {
  test("returns input unchanged when within max", () => {
    expect(truncate("hello", 80)).toBe("hello");
    // Exactly at max — no ellipsis.
    expect(truncate("abcdef", 6)).toBe("abcdef");
  });

  test("adds ellipsis when over max and respects the limit", () => {
    const result = truncate("abcdef", 4);
    expect(result).toBe("abc…");
    expect(result.length).toBe(4);
  });
});

describe("progressBar", () => {
  test("returns LIVE indicator for unknown total duration", () => {
    expect(progressBar(0, 0)).toBe("🔴 LIVE");
    expect(progressBar(10, -5)).toBe("🔴 LIVE");
  });

  test("places the marker at the start for 0 progress", () => {
    const bar = progressBar(0, 100, 20);
    expect(bar.startsWith("🔘")).toBe(true);
    expect(bar.slice("🔘".length)).toBe("▬".repeat(19));
  });

  test("places the marker at the end when fully played", () => {
    const bar = progressBar(100, 100, 20);
    expect(bar.endsWith("🔘")).toBe(true);
    expect(bar.slice(0, -"🔘".length)).toBe("▬".repeat(19));
  });

  test("places the marker mid-track at the expected position", () => {
    const bar = progressBar(50, 100, 21);
    // 21-wide bar, halfway → position 10.
    const segments = [...bar.matchAll(/▬|🔘/gu)].map((m) => m[0]);
    expect(segments).toHaveLength(21);
    expect(segments[10]).toBe("🔘");
    expect(segments.filter((s) => s === "🔘")).toHaveLength(1);
  });

  test("clamps progress greater than total without throwing", () => {
    const bar = progressBar(999, 100, 20);
    expect(bar.endsWith("🔘")).toBe(true);
  });
});
