import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { config } from "../config.ts";
import type { Track } from "../types.ts";
import { truncate } from "../utils/format.ts";
import { logger } from "../utils/logger.ts";

const log = logger.scope("ytdlp");

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

function sanitizeArgs(args: readonly string[]): string[] {
  return args.map((arg) => (isUrl(arg) ? truncate(arg, 120) : arg));
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

  log.debug("spawning-ytdlp", { args: sanitizeArgs(args) });

  return new Promise((resolve, reject) => {
    const proc = spawn(config.ytdlpPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    proc.stdout.on("data", (c: Buffer) => chunks.push(c));
    proc.stderr.on("data", (c: Buffer) => errChunks.push(c));
    proc.on("error", (err) => {
      log.error("ytdlp-spawn-failed", { err });
      reject(err);
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        const stderr = Buffer.concat(errChunks).toString("utf8");
        const tail = truncate(stderr.trim(), 500);
        log.error("ytdlp-metadata-failed", {
          exitCode: code ?? -1,
          stderr: tail,
        });
        reject(new Error(`yt-dlp exited with code ${code}: ${stderr.trim()}`));
        return;
      }
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        const info = JSON.parse(text) as YtdlpInfo;
        const trackCount =
          info._type === "playlist" && Array.isArray(info.entries)
            ? info.entries.filter(Boolean).length
            : 1;
        log.info("metadata-resolved", {
          title: info.title ?? info.entries?.[0]?.title ?? "Unknown title",
          duration: info.duration ?? info.entries?.[0]?.duration ?? null,
          playlistSize:
            info._type === "playlist" && Array.isArray(info.entries)
              ? trackCount
              : null,
        });
        resolve(info);
      } catch (err) {
        log.error("ytdlp-json-parse-failed", { err });
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
  const args = [
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
  ];

  log.debug("stream-spawn", { args: sanitizeArgs(args) });

  const proc = spawn(config.ytdlpPath, args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  log.debug("stream-started", { url: truncate(url, 120) });

  proc.stderr.on("data", () => {});
  proc.on("error", (err) => {
    log.error("stream-spawn-failed", { url: truncate(url, 120), err });
    proc.stdout.destroy(err);
  });
  proc.on("close", (code, signal) => {
    log.debug("stream-exited", {
      url: truncate(url, 120),
      exitCode: code,
      signal,
    });
  });

  return {
    stream: proc.stdout,
    cleanup: () => {
      if (!proc.killed) proc.kill("SIGKILL");
    },
  };
}
