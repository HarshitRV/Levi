# levi-music-bot

A Discord music bot powered by **[Bun](https://bun.com)**, **[yt-dlp](https://github.com/yt-dlp/yt-dlp)**, and **[discord.js](https://discord.js.org)**.

Plays from YouTube (and anything else yt-dlp supports — SoundCloud, Bandcamp, direct URLs, etc.) with a per-guild queue, loop modes, history-aware previous, volume control, and more.

## Features

| Command                     | What it does                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `/play <query>`             | Play a URL, playlist URL, or YouTube search. Queues if something is already playing. |
| `/pause`                    | Pause the current track.                                                             |
| `/resume`                   | Resume the paused track.                                                             |
| `/skip`                     | Skip to the next track.                                                              |
| `/previous`                 | Re-queue the previous track from history and play it.                                |
| `/loop <off\|track\|queue>` | Set loop mode.                                                                       |
| `/queue [page]`             | Show the current queue with pagination (10 per page).                                |
| `/nowplaying`               | Show the current track with a progress bar.                                          |
| `/shuffle`                  | Randomize the upcoming tracks.                                                       |
| `/remove <position>`        | Remove a track from the upcoming queue.                                              |
| `/clear`                    | Clear the upcoming queue (keeps the current track).                                  |
| `/volume <0-200>`           | Set playback volume in percent.                                                      |
| `/join`                     | Make the bot join your voice channel.                                                |
| `/leave`                    | Disconnect and clear the queue.                                                      |
| `/stop`                     | Stop, clear the queue, and disconnect.                                               |

## Prerequisites

- [Bun](https://bun.com) ≥ 1.3
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) on your `PATH` (or set `YTDLP_PATH`)
- [`ffmpeg`](https://ffmpeg.org) on your `PATH` (or set `FFMPEG_PATH`)

On macOS:

```bash
brew install bun yt-dlp ffmpeg
```

## Setup

1. **Create the bot**
   - Go to <https://discord.com/developers/applications> → **New Application**.
   - Under **Bot**, click **Reset Token** and copy it.
   - Copy the **Application ID** from the General Information tab.
   - Under **Installation** → **Default Install Settings**, set scopes to `bot` and `applications.commands`, and grant the permissions: _View Channels_, _Send Messages_, _Embed Links_, _Connect_, _Speak_, _Use Voice Activity_.
   - Use the generated install link to invite the bot to your server.

2. **Configure the env**

   ```bash
   cp .env.example .env
   ```

   Fill in `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`. Optionally set `DISCORD_GUILD_ID` to a test guild for instant slash-command updates.

### Logging

Set `LOG_LEVEL` in `.env` to control console verbosity (`debug`, `info`, `warn`, or `error`; default `info`). Logs look like:

```
2026-05-28T13:54:01.123Z INFO  [queue:923] track-started title="Bohemian Rhapsody" url=https://youtu.be/… requestedBy=harshit
```

- **`debug`** — command/button invocations, queue lifecycle, yt-dlp subprocess spawns, audio resource creation.
- **`info`** — ready/join/leave, track transitions, playback controls, metadata resolution.
- **`warn`** — voice connection trouble, resolution failures, permission rejections.
- **`error`** — command crashes, player/yt-dlp failures, unhandled rejections.

3. **Install deps**

   ```bash
   bun install
   ```

4. **Register the slash commands**

   ```bash
   bun run deploy
   ```

   Guild commands are visible immediately; global commands can take up to an hour.

5. **Run it**

   ```bash
   bun run start
   # or, with hot-reload
   bun run dev
   ```

## Testing

```bash
bun run test               # unit tests (fast, no network)
bun run test:watch         # unit tests in watch mode
bun run test:integration   # live yt-dlp subprocess tests (hits YouTube)
bun run test:all           # typecheck + lint + format:check + tests
```

Integration tests are opt-in (gated by `RUN_INTEGRATION_TESTS=1`) so the default `bun test` run stays fast and offline.

The queue state machine (`src/music/queue-state.ts`) is a pure class with no I/O — the entire `play`/`skip`/`previous`/`loop` behavior is covered by unit tests on that class. The yt-dlp parser (`parseYtdlpInfo`) is tested independently of the subprocess; the actual subprocess is exercised by the integration suite.

## Developer experience

```bash
bun run lint               # ESLint (flat config + typescript-eslint)
bun run lint:fix
bun run format             # Prettier --write
bun run format:check
```

**Pre-commit hooks** (via [Husky](https://typicode.github.io/husky/)):

- **`pre-commit`** runs [`lint-staged`](https://github.com/lint-staged/lint-staged), which formats and lints only the files you actually changed.
- **`commit-msg`** runs [`commitlint`](https://commitlint.js.org) against [Conventional Commits](https://www.conventionalcommits.org). Examples:

  ```
  feat(play): support Spotify URLs via yt-dlp
  fix(queue): /previous no longer double-records history
  chore(deps): bump discord.js to 14.27
  ```

Hooks are installed automatically by `bun install` (via the `prepare` script). If you ever need to bypass them temporarily:

```bash
git commit --no-verify
```

VS Code users get format-on-save and ESLint integration out of the box via `.vscode/settings.json`. Recommended extensions are listed in `.vscode/extensions.json`.

## Supply-chain policy

Every dependency is locked down to reduce the blast radius of npm-style supply-chain attacks:

- **Exact versions only.** No `^` / `~` / ranges in `dependencies` or `devDependencies` — what's in `package.json` matches what's in `bun.lock`.
- **Registry only.** `file:`, `link:`, `git:`, `github:`, `http(s):`, `workspace:`, `npm:` aliases, `patch:`, `portal:`, and `bundle:` specifiers are rejected.
- **No floating tags.** `latest` / `next` / `*` are rejected (they re-resolve on every install).
- **7-day quarantine.** `install.minimumReleaseAge = 604800` in `bunfig.toml` refuses any npm version published less than 7 days ago — typical compromises are caught and yanked well within that window.
- **Default-secure lifecycle scripts.** Bun only runs `preinstall` / `install` / `postinstall` for packages in `trustedDependencies` (currently just `@discordjs/opus`, which needs a native build) plus Bun's built-in allowlist. Everything else is silently skipped.
- **Pinned toolchain.** `engines.bun` and `packageManager` declare the expected Bun version so contributors and CI converge on the same runtime.
- **Reproducible CI.** Use `bun install --frozen-lockfile` (or `bun ci`) in CI to fail the build on any lockfile drift.

The first four rules are enforced by [`scripts/check-deps.ts`](./scripts/check-deps.ts), which runs as part of `bun run test:all` and `bun run audit:deps`. Bumping a dep is a deliberate act: pick the new version, run `bun add <pkg>@<exact-version>`, and let the audit script gate the change.

## How it works

- `yt-dlp -J <query>` resolves metadata (URLs, playlists, or `ytsearch1:` queries).
- For playback, `yt-dlp -o - -f bestaudio` is spawned and its stdout is piped into `@discordjs/voice`'s `createAudioResource`. `prism-media` + `ffmpeg` transcode to Opus on the fly.
- Each guild owns one `GuildQueue` (in `src/music/guild-queue.ts`) which holds the voice connection, the player, the upcoming list, a history stack for `/previous`, the loop mode, and the volume transformer.

## Project layout

```
src/
├── index.ts                 # client + interaction dispatcher
├── deploy-commands.ts       # registers slash commands with Discord
├── config.ts                # env loading + validation
├── types.ts                 # shared types (Track, LoopMode, Command)
├── music/
│   ├── queue-manager.ts     # Map<guildId, GuildQueue>
│   ├── guild-queue.ts       # per-guild voice + player; composes QueueState
│   ├── queue-state.ts       # pure state machine (queue + history + loop)
│   └── ytdlp.ts             # yt-dlp metadata + stream helpers
├── utils/
│   ├── embeds.ts            # consistent embed colors/builders
│   ├── format.ts            # duration / progress-bar helpers
│   └── logger.ts            # scoped console logging (LOG_LEVEL)
└── commands/                # one file per slash command
```

## Notes

- The bot uses only the `Guilds` and `GuildVoiceStates` intents — no message-content intent required.
- Volume uses an inline volume transformer, so it works mid-track and survives skip.
- `/previous` re-queues the rewinded track at the front and pushes the currently playing track right after it, so chaining `/previous` rewinds further.
