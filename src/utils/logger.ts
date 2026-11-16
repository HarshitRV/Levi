export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_LABEL: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: "INFO ",
  warn: "WARN ",
  error: "ERROR",
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: "\u001b[36m",
  info: "\u001b[32m",
  warn: "\u001b[33m",
  error: "\u001b[31m",
};

const RESET = "\u001b[0m";
// eslint-disable-next-line no-control-regex -- intentional ANSI strip for error stacks
const ANSI_RE = /\u001b\[[0-9;]*m/g;

let invalidLevelWarned = false;

export function parseLogLevel(raw: string | undefined): LogLevel {
  const value = raw?.trim().toLowerCase();
  if (
    value === "debug" ||
    value === "info" ||
    value === "warn" ||
    value === "error"
  ) {
    return value;
  }
  if (raw !== undefined && raw.trim() !== "") {
    if (!invalidLevelWarned) {
      invalidLevelWarned = true;
      console.warn(
        `Invalid LOG_LEVEL "${raw.trim()}", falling back to "info".`,
      );
    }
  }
  return "info";
}

export type LogKv = Record<string, unknown>;

export interface FormatOptions {
  isTty?: boolean;
}

function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

function needsQuoting(value: string): boolean {
  if (value.length === 0) return true;
  return !/^[\w./:@-]+$/.test(value);
}

function escapeQuoted(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function formatScalar(value: unknown): string {
  if (value instanceof Error) {
    return escapeQuoted(stripAnsi(value.message));
  }
  if (typeof value === "string") {
    return needsQuoting(value) ? escapeQuoted(value) : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) {
    return String(value);
  }
  return escapeQuoted(JSON.stringify(value));
}

function expandKv(kv: LogKv): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(kv)) {
    if (value instanceof Error) {
      parts.push(`${key}.name=${formatScalar(value.name)}`);
      parts.push(`${key}.message=${formatScalar(value.message)}`);
      if (value.stack) {
        parts.push(`${key}.stack=${formatScalar(stripAnsi(value.stack))}`);
      }
      continue;
    }
    parts.push(`${key}=${formatScalar(value)}`);
  }
  return parts;
}

export function format(
  level: LogLevel,
  scope: string,
  message: string,
  kv: LogKv | undefined,
  now: Date,
  options: FormatOptions = {},
): string {
  const isTty = options.isTty ?? false;
  const timestamp = now.toISOString();
  const levelToken = isTty
    ? `${LEVEL_COLOR[level]}${LEVEL_LABEL[level]}${RESET}`
    : LEVEL_LABEL[level];
  const kvText =
    kv && Object.keys(kv).length > 0 ? ` ${expandKv(kv).join(" ")}` : "";
  return `${timestamp} ${levelToken} [${scope}] ${message}${kvText}`;
}

export interface ScopedLogger {
  debug(message: string, kv?: LogKv): void;
  info(message: string, kv?: LogKv): void;
  warn(message: string, kv?: LogKv): void;
  error(message: string, kv?: LogKv): void;
}

export interface Logger extends ScopedLogger {
  scope(scope: string): ScopedLogger;
}

export interface CreateLoggerOptions {
  isTty?: boolean;
}

export function createLogger(
  minLevel: LogLevel,
  options: CreateLoggerOptions = {},
): Logger {
  const isTty = options.isTty ?? Boolean(process.stdout.isTTY);
  const minRank = LEVEL_ORDER[minLevel];

  const write = (
    level: LogLevel,
    scope: string,
    message: string,
    kv?: LogKv,
  ) => {
    if (LEVEL_ORDER[level] < minRank) return;
    const line = format(level, scope, message, kv, new Date(), { isTty });
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  };

  const scoped = (scope: string): ScopedLogger => ({
    debug: (message, kv) => write("debug", scope, message, kv),
    info: (message, kv) => write("info", scope, message, kv),
    warn: (message, kv) => write("warn", scope, message, kv),
    error: (message, kv) => write("error", scope, message, kv),
  });

  return {
    ...scoped("app"),
    scope: scoped,
  };
}

export const logger = createLogger(parseLogLevel(process.env.LOG_LEVEL));
