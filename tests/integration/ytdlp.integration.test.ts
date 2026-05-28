/**
 * Live yt-dlp subprocess tests. These actually shell out to `yt-dlp` and hit
 * the real YouTube CDN, so they are slow and depend on the network.
 *
 * They run only when `RUN_INTEGRATION_TESTS=1` is set, e.g.:
 *
 *   bun run test:integration
 *
 * `resolveTracks` imports `config` which validates env vars at module load
 * time, so we stub the required values before importing.
 */

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

const RUN = process.env.RUN_INTEGRATION_TESTS === "1";

// Make sure `config` doesn't throw when ytdlp.ts pulls it in.
process.env.DISCORD_TOKEN ||= "integration-stub";
process.env.DISCORD_CLIENT_ID ||= "integration-stub";

// Bun's `test.skipIf` keeps the file syntactically valid even when the
// integration env var isn't set.
const integration = test.skipIf(!RUN);

// Sanity check: bail out fast if yt-dlp isn't even installed.
function ytdlpAvailable(): boolean {
  try {
    const r = spawnSync("yt-dlp", ["--version"], { stdio: "ignore" });
    return r.status === 0;
  } catch {
    return false;
  }
}

describe("yt-dlp live integration", () => {
  integration(
    "resolves a YouTube URL into a single playable track",
    async () => {
      if (!ytdlpAvailable()) {
        throw new Error("yt-dlp must be on PATH for integration tests.");
      }
      const { resolveTracks } = await import("../../src/music/ytdlp.ts");
      const tracks = await resolveTracks(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "0",
        "integration",
      );
      expect(tracks).toHaveLength(1);
      const track = tracks[0]!;
      expect(track.url).toContain("dQw4w9WgXcQ");
      expect(track.title.length).toBeGreaterThan(0);
      expect(track.durationSec).toBeGreaterThan(0);
    },
    30_000,
  );

  integration(
    "resolves a free-text search into a single track",
    async () => {
      if (!ytdlpAvailable()) {
        throw new Error("yt-dlp must be on PATH for integration tests.");
      }
      const { resolveTracks } = await import("../../src/music/ytdlp.ts");
      const tracks = await resolveTracks(
        "never gonna give you up",
        "0",
        "integration",
      );
      expect(tracks).toHaveLength(1);
      expect(tracks[0]!.title.length).toBeGreaterThan(0);
      expect(tracks[0]!.url.startsWith("http")).toBe(true);
    },
    30_000,
  );
});
