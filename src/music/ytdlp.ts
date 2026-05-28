import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { config } from "../config.ts";
import type { Track } from "../types.ts";

/**
 * yt-dlp's JSON shape is enormous; we pick the fields we use.
 * https://github.com/yt-dlp/yt-dlp#output-template
 */
export interface YtdlpInfo {
  id?: string;
  title?: string;
  webpage_url?: string;
  original_url?: string;
  url?: string;
  duration?: number;
  is_live?: boolean;
  thumbnail?: string;
  thumbnails?: { url: string }[];
  uploader?: string;
  channel?: string;
  _type?: "playlist" | "url" | "video";
  entries?: YtdlpInfo[];
}

const URL_RE = /^https?:\/\//i;

export function isUrl(input: string): boolean {
  return URL_RE.test(input.trim());
}

function pickThumbnail(info: YtdlpInfo): string | null {
  if (info.thumbnail) return info.thumbnail;
  const last = info.thumbnails?.at(-1);
  return last?.url ?? null;
}

/** Convert a single yt-dlp info object into a {@link Track}. Pure. */
export function infoToTrack(
  info: YtdlpInfo,
  requestedBy: string,
  requestedByName: string,
): Track {
  const url =
    info.webpage_url ||
    info.original_url ||
    (info.id ? `https://www.youtube.com/watch?v=${info.id}` : info.url) ||
    "";

  return {
    url,
    title: info.title ?? "Unknown title",
    durationSec: info.is_live ? 0 : (info.duration ?? 0),
    thumbnail: pickThumbnail(info),
    requestedBy,
    requestedByName,
  };
}

/**
 * Convert a yt-dlp `-J` response into a list of tracks. Pure — no I/O.
 *
 * Handles three shapes:
 *  - Single video: a top-level info object with no `entries`.
 *  - Search wrapper: `_type: "playlist"` (or unset) with `entries[0]` being
 *    the first match — we take just the first.
 *  - Real playlist: `_type: "playlist"` with multiple `entries`.
 *
 * Throws if no playable entries can be extracted.
 */
export function parseYtdlpInfo(
  info: YtdlpInfo,
  requestedBy: string,
  requestedByName: string,
): Track[] {
  if (info._type === "playlist" && Array.isArray(info.entries)) {
    const tracks: Track[] = [];
    for (const entry of info.entries) {
      if (!entry) continue;
      tracks.push(infoToTrack(entry, requestedBy, requestedByName));
    }
    if (tracks.length === 0) {
      throw new Error("Playlist contained no playable entries.");
    }
    return tracks;
  }

  if (Array.isArray(info.entries) && info.entries.length > 0) {
    const first = info.entries[0];
    if (!first) throw new Error("No results found.");
    return [infoToTrack(first, requestedBy, requestedByName)];
  }

  return [infoToTrack(info, requestedBy, requestedByName)];
}

/**
 * Run `yt-dlp -J` on a URL or `ytsearch1:` query and return the parsed JSON.
 * `-J` is "dump full JSON (combined)" — gives us metadata without downloading.
 */
async function runYtdlpJson(target: string): Promise<YtdlpInfo> {
  const args = [
    "-J",
    "--no-warnings",
    "--no-playlist",
    "--no-call-home",
    "--default-search",
    "ytsearch",
    target,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(config.ytdlpPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    proc.stdout.on("data", (c: Buffer) => chunks.push(c));
    proc.stderr.on("data", (c: Buffer) => errChunks.push(c));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        const stderr = Buffer.concat(errChunks).toString("utf8");
        reject(new Error(`yt-dlp exited with code ${code}: ${stderr.trim()}`));
        return;
      }
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(text) as YtdlpInfo);
      } catch (err) {
        reject(err as Error);
      }
    });
  });
}

/**
 * Resolve a user-provided string (URL, search query, or playlist URL) into
 * one or more tracks. Returns at least one track or throws.
 */
export async function resolveTracks(
  query: string,
  requestedBy: string,
  requestedByName: string,
): Promise<Track[]> {
  const target = isUrl(query) ? query : `ytsearch1:${query}`;
  const info = await runYtdlpJson(target);
  return parseYtdlpInfo(info, requestedBy, requestedByName);
}

/**
 * Open an audio stream for a track by spawning yt-dlp and writing the best
 * audio to stdout. We pass the raw stream to @discordjs/voice which uses
 * prism-media + ffmpeg to transcode to opus.
 */
export function streamTrack(url: string): {
  stream: Readable;
  cleanup: () => void;
} {
  const proc = spawn(
    config.ytdlpPath,
    [
      "-o",
      "-",
      "-f",
      "bestaudio[ext=webm]/bestaudio/best",
      "--no-playlist",
      "--no-warnings",
      "--no-call-home",
      "--quiet",
      "--no-part",
      url,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  // Drain stderr so the process doesn't block on a full pipe buffer.
  proc.stderr.on("data", () => {});
  proc.on("error", (err) => {
    proc.stdout.destroy(err);
  });

  return {
    stream: proc.stdout,
    cleanup: () => {
      if (!proc.killed) proc.kill("SIGKILL");
    },
  };
}
