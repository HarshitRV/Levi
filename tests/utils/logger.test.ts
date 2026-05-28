import { describe, expect, test } from "vitest";
import {
  createLogger,
  format,
  parseLogLevel,
  type LogLevel,
} from "../../src/utils/logger.ts";

const FIXED_NOW = new Date("2026-05-28T13:54:01.123Z");

describe("format", () => {
  test("renders timestamp, level, scope, message, and kv pairs in order", () => {
    const line = format(
      "info",
      "queue:923",
      "track-started",
      {
        title: "Bohemian Rhapsody",
        url: "https://youtu.be/example",
        requestedBy: "harshit",
      },
      FIXED_NOW,
      { isTty: false },
    );

    expect(line).toBe(
      '2026-05-28T13:54:01.123Z INFO  [queue:923] track-started title="Bohemian Rhapsody" url=https://youtu.be/example requestedBy=harshit',
    );
  });

  test("uses the injected now parameter for the ISO timestamp", () => {
    const line = format("debug", "app", "ready", undefined, FIXED_NOW, {
      isTty: false,
    });
    expect(line.startsWith("2026-05-28T13:54:01.123Z")).toBe(true);
  });

  test("quotes values that contain spaces, equals, or quotes", () => {
    const line = format(
      "warn",
      "play",
      "play-resolution-failed",
      {
        reason: "bad query = broken",
        note: 'say "hello"',
      },
      FIXED_NOW,
      { isTty: false },
    );

    expect(line).toContain('reason="bad query = broken"');
    expect(line).toContain('note="say \\"hello\\""');
  });

  test("formats Error values with name, message, and stack", () => {
    const err = new Error("boom");
    err.stack = "Error: boom\n    at test.ts:1:1";

    const line = format("error", "ytdlp", "ytdlp-failed", { err }, FIXED_NOW, {
      isTty: false,
    });

    expect(line).toContain("err.name=Error");
    expect(line).toContain("err.message=boom");
    expect(line).toContain("err.stack=");
    expect(line).toContain("at test.ts:1:1");
  });
});

describe("parseLogLevel", () => {
  test("accepts valid levels", () => {
    expect(parseLogLevel("debug")).toBe("debug");
    expect(parseLogLevel(" INFO ")).toBe("info");
    expect(parseLogLevel("WARN")).toBe("warn");
    expect(parseLogLevel("error")).toBe("error");
  });

  test("falls back to info for invalid values", () => {
    expect(parseLogLevel("verbose")).toBe("info");
    expect(parseLogLevel(undefined)).toBe("info");
    expect(parseLogLevel("")).toBe("info");
  });
});

describe("createLogger level gating", () => {
  test("filters debug and info when min level is warn", () => {
    const lines: string[] = [];
    const log = createLogger("warn", { isTty: false });
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (msg?: unknown) => {
      lines.push(String(msg));
    };
    console.warn = (msg?: unknown) => {
      lines.push(String(msg));
    };
    console.error = (msg?: unknown) => {
      lines.push(String(msg));
    };

    try {
      log.debug("hidden-debug");
      log.info("hidden-info");
      log.warn("visible-warn");
      log.error("visible-error");
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    }

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("visible-warn");
    expect(lines[1]).toContain("visible-error");
  });

  test("factory accepts an explicit level without reading env", () => {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    for (const level of levels) {
      expect(createLogger(level).scope("test")).toBeDefined();
    }
  });
});
