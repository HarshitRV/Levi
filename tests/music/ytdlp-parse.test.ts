import { describe, expect, test } from "bun:test";
import {
  infoToTrack,
  isUrl,
  parseYtdlpInfo,
  type YtdlpInfo,
} from "../../src/music/ytdlp.ts";

const REQ = { id: "user-1", name: "Tester" } as const;
const callInfo = (info: YtdlpInfo) => infoToTrack(info, REQ.id, REQ.name);
const callParse = (info: YtdlpInfo) => parseYtdlpInfo(info, REQ.id, REQ.name);

describe("isUrl", () => {
  test.each([
    ["https://www.youtube.com/watch?v=abc", true],
    ["http://example.com", true],
    ["HTTPS://example.com", true],
    ["  https://example.com  ", true],
    ["youtube.com/watch?v=abc", false],
    ["never gonna give you up", false],
    ["", false],
  ])("isUrl(%j) = %p", (input, expected) => {
    expect(isUrl(input)).toBe(expected);
  });
});

describe("infoToTrack", () => {
  test("maps title, duration, thumbnail, and requester through", () => {
    const track = callInfo({
      id: "abc",
      title: "Hello",
      webpage_url: "https://www.youtube.com/watch?v=abc",
      duration: 213,
      thumbnail: "https://example.test/thumb.jpg",
    });
    expect(track).toEqual({
      url: "https://www.youtube.com/watch?v=abc",
      title: "Hello",
      durationSec: 213,
      thumbnail: "https://example.test/thumb.jpg",
      requestedBy: REQ.id,
      requestedByName: REQ.name,
    });
  });

  test("uses the last thumbnail in `thumbnails` when `thumbnail` is missing", () => {
    const track = callInfo({
      id: "abc",
      title: "x",
      thumbnails: [
        { url: "https://example.test/sd.jpg" },
        { url: "https://example.test/hd.jpg" },
      ],
    });
    expect(track.thumbnail).toBe("https://example.test/hd.jpg");
  });

  test("returns null thumbnail when no thumbnail data exists", () => {
    const track = callInfo({ id: "abc", title: "x" });
    expect(track.thumbnail).toBeNull();
  });

  test("falls back to 'Unknown title' when title is missing", () => {
    expect(callInfo({ id: "abc" }).title).toBe("Unknown title");
  });

  test("treats live streams as duration 0", () => {
    const track = callInfo({
      id: "abc",
      title: "live",
      is_live: true,
      duration: 99999, // yt-dlp sometimes reports stale duration on live streams
    });
    expect(track.durationSec).toBe(0);
  });

  test("defaults duration to 0 when absent", () => {
    expect(callInfo({ id: "abc" }).durationSec).toBe(0);
  });

  test("prefers webpage_url over original_url and synthesized URL", () => {
    expect(
      callInfo({
        id: "abc",
        webpage_url: "https://wp.example.test/v",
        original_url: "https://orig.example.test/v",
      }).url,
    ).toBe("https://wp.example.test/v");
  });

  test("falls back to original_url, then synthesized YouTube URL, then info.url", () => {
    expect(
      callInfo({ id: "abc", original_url: "https://orig.example.test/v" }).url,
    ).toBe("https://orig.example.test/v");

    expect(callInfo({ id: "abc" }).url).toBe(
      "https://www.youtube.com/watch?v=abc",
    );

    expect(callInfo({ url: "https://direct.example.test/audio.mp3" }).url).toBe(
      "https://direct.example.test/audio.mp3",
    );
  });
});

describe("parseYtdlpInfo · single video", () => {
  test("returns a single track for a top-level video info object", () => {
    const tracks = callParse({
      id: "abc",
      title: "Hello",
      duration: 100,
      webpage_url: "https://www.youtube.com/watch?v=abc",
    });
    expect(tracks).toHaveLength(1);
    expect(tracks[0]!.title).toBe("Hello");
  });
});

describe("parseYtdlpInfo · search results", () => {
  test("takes only the first entry from a non-playlist `entries` wrapper", () => {
    // yt-dlp wraps `ytsearchN:` results as a playlist with `entries`. With
    // `--no-playlist` / `ytsearch1:` we still get a one-entry wrapper.
    const tracks = callParse({
      entries: [
        { id: "first", title: "first", webpage_url: "https://example.test/1" },
        {
          id: "second",
          title: "second",
          webpage_url: "https://example.test/2",
        },
      ],
    });
    expect(tracks).toHaveLength(1);
    expect(tracks[0]!.title).toBe("first");
  });
});

describe("parseYtdlpInfo · playlists", () => {
  test("returns one track per entry when _type is 'playlist'", () => {
    const tracks = callParse({
      _type: "playlist",
      entries: [
        { id: "a", title: "a", duration: 10 },
        { id: "b", title: "b", duration: 20 },
        { id: "c", title: "c", duration: 30 },
      ],
    });
    expect(tracks.map((t) => t.title)).toEqual(["a", "b", "c"]);
    expect(tracks.map((t) => t.durationSec)).toEqual([10, 20, 30]);
  });

  test("skips null entries (yt-dlp emits these for unavailable/private items)", () => {
    const tracks = callParse({
      _type: "playlist",
      entries: [
        { id: "a", title: "a" },
        null as unknown as YtdlpInfo,
        { id: "c", title: "c" },
      ],
    });
    expect(tracks.map((t) => t.title)).toEqual(["a", "c"]);
  });

  test("throws when a playlist has zero playable entries", () => {
    expect(() => callParse({ _type: "playlist", entries: [] })).toThrow(
      /contained no playable entries/i,
    );
  });
});
