# levi-music-bot

A Discord music bot powered by **[Node.js](https://nodejs.org)**, **[yt-dlp](https://github.com/yt-dlp/yt-dlp)**, and **[discord.js](https://discord.js.org)**.

Plays from YouTube (and anything else yt-dlp supports — SoundCloud, Bandcamp, direct URLs, etc.) with a per-guild queue, loop modes, history-aware previous, volume control, and more.

> **Branch note.** This branch (`node-pnpm-pi`) runs the bot under Node.js + pnpm so it can deploy on Linux (specifically Raspberry Pi / Ubuntu). The `main` branch runs under Bun, which is the preferred dev runtime on macOS but currently crashes on Linux when loading `@discordjs/opus` because Bun's POSIX libuv shim doesn't yet implement `uv_version_string` ([oven-sh/bun#18546](https://github.com/oven-sh/bun/issues/18546)). When Bun closes that gap, the two branches collapse back into one.

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

- [Node.js](https://nodejs.org) ≥ 20.18 (so `corepack` is built-in)
- [pnpm](https://pnpm.io) ≥ 10.6 (managed via `corepack`, pinned by `packageManager` in `package.json`)
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) on your `PATH` (or set `YTDLP_PATH`)
- [`ffmpeg`](https://ffmpeg.org) on your `PATH` (or set `FFMPEG_PATH`)
- A C/C++ toolchain so pnpm can build `@discordjs/opus` from source on Linux (no upstream prebuilt for glibc ≥ 2.42).

### Ubuntu / Debian / Raspberry Pi

System packages:

```bash
sudo apt update
sudo apt install -y ffmpeg nodejs node-gyp build-essential
```

pnpm via the bundled corepack:

```bash
corepack enable
corepack prepare pnpm@10.33.4 --activate
```

yt-dlp standalone binary (skip the apt package — it lags fast-moving YouTube extractor changes). Pick the asset for your architecture (`uname -m`):

| `uname -m` | Asset                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `aarch64`  | [`yt-dlp_linux_aarch64`](https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64) (Pi 4 / 5, ARM64) |
| `x86_64`   | [`yt-dlp_linux`](https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux) (most Ubuntu desktops/servers)    |
| `armv7l`   | [`yt-dlp_linux_armv7l`](https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_armv7l) (32-bit Pi)         |

```bash
ARCH_ASSET=yt-dlp_linux_aarch64   # change to match the table above
sudo curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/$ARCH_ASSET" \
  -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

Update yt-dlp later with `sudo yt-dlp -U`.

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

3. **Install deps**

   On Ubuntu 25.10 / GCC 15, libopus's bundled ARM NEON path tickles a `-Werror=implicit-function-declaration` that wasn't a hard error in older GCC. Wrap the first install so the source build succeeds:

   ```bash
   CFLAGS="-Wno-error=implicit-function-declaration" \
   CXXFLAGS="-Wno-error=implicit-function-declaration" \
   pnpm install
   ```

   On any other Linux/macOS host with a prebuilt `@discordjs/opus` or an older GCC, plain `pnpm install` is fine.

4. **Register the slash commands**

   ```bash
   pnpm run deploy
   ```

   Guild commands are visible immediately; global commands can take up to an hour.

5. **Run it**

   ```bash
   pnpm start
   # or, with hot-reload
   pnpm dev
   ```

   Both scripts pass `--env-file=.env` to tsx so the bot picks up `DISCORD_TOKEN` and friends natively via Node's built-in dotenv loader — no `dotenv` runtime dependency.

### Running under pm2

For long-lived deployments (e.g. on the Pi), the repo ships [`ecosystem.config.cjs`](./ecosystem.config.cjs). Every pm2 script in `package.json` is scoped to the `levi` app, so it never touches other pm2-managed apps on the same host.

```bash
pnpm pm2:start    # start the bot under pm2 (fork mode, 500M memory cap)
pnpm pm2:status   # describe the levi process
pnpm pm2:logs     # tail combined stdout/stderr from logs/levi.{out,err}.log
pnpm pm2:restart  # restart on demand
pnpm pm2:stop     # stop without removing from pm2
pnpm pm2:delete   # remove from pm2 entirely
```

To persist across reboot, run `pm2 save` once after `pnpm pm2:start` (and `pm2 startup` if you haven't set up the boot hook before — that one is per-machine, not per-app).

The ecosystem file pins the interpreter to a specific nvm Node binary; if you use a different Node install (apt's `/usr/bin/node`, asdf, fnm, etc.), update the `interpreter` field to match.

### Logging

Set `LOG_LEVEL` in `.env` to control console verbosity (`debug`, `info`, `warn`, or `error`; default `info`). Logs look like:

```
2026-05-28T13:54:01.123Z INFO  [queue:923] track-started title="Bohemian Rhapsody" url=https://youtu.be/… requestedBy=harshit
```

- **`debug`** — command/button invocations, queue lifecycle, yt-dlp subprocess spawns, audio resource creation.
- **`info`** — ready/join/leave, track transitions, playback controls, metadata resolution.
- **`warn`** — voice connection trouble, resolution failures, permission rejections.
- **`error`** — command crashes, player/yt-dlp failures, unhandled rejections.

## Testing

```bash
pnpm test                  # unit tests (fast, no network) via vitest
pnpm run test:watch        # unit tests in watch mode
pnpm run test:integration  # live yt-dlp subprocess tests (hits YouTube)
pnpm run test:all          # audit + typecheck + lint + format:check + tests
```

Integration tests are opt-in (gated by `RUN_INTEGRATION_TESTS=1`) so the default `pnpm test` run stays fast and offline.

The queue state machine (`src/music/queue-state.ts`) is a pure class with no I/O — the entire `play`/`skip`/`previous`/`loop` behavior is covered by unit tests on that class. The yt-dlp parser (`parseYtdlpInfo`) is tested independently of the subprocess; the actual subprocess is exercised by the integration suite.

## Developer experience

```bash
pnpm run lint              # ESLint (flat config + typescript-eslint)
pnpm run lint:fix
pnpm run format            # Prettier --write
pnpm run format:check
```

**Pre-commit hooks** (via [Husky](https://typicode.github.io/husky/)):

- **`pre-commit`** runs [`lint-staged`](https://github.com/lint-staged/lint-staged), which formats and lints only the files you actually changed.
- **`commit-msg`** runs [`commitlint`](https://commitlint.js.org) against [Conventional Commits](https://www.conventionalcommits.org). Examples:

  ```
  feat(play): support Spotify URLs via yt-dlp
  fix(queue): /previous no longer double-records history
  chore(deps): bump discord.js to 14.27
  ```

Hooks are installed automatically by `pnpm install` (via the `prepare` script). If you ever need to bypass them temporarily:

```bash
git commit --no-verify
```

VS Code users get format-on-save and ESLint integration out of the box via `.vscode/settings.json`. Recommended extensions are listed in `.vscode/extensions.json`.

## Supply-chain policy

Every dependency is locked down to reduce the blast radius of npm-style supply-chain attacks:

- **Exact versions only.** `.npmrc` sets `save-exact=true`; no `^` / `~` / ranges in `dependencies` or `devDependencies` — what's in `package.json` matches what's in `pnpm-lock.yaml`.
- **Registry only.** `file:`, `link:`, `git:`, `github:`, `http(s):`, `workspace:`, `npm:` aliases, `patch:`, `portal:`, and `bundle:` specifiers are rejected.
- **No floating tags.** `latest` / `next` / `*` are rejected (they re-resolve on every install).
- **7-day quarantine.** `.npmrc` sets `minimum-release-age=10080` (minutes, = 7 days) so pnpm refuses any npm version published less than 7 days ago — typical compromises are caught and yanked well within that window.
- **Default-secure lifecycle scripts.** `pnpm.onlyBuiltDependencies` in `package.json` lists the only package whose `preinstall` / `install` / `postinstall` is allowed to run (currently just `@discordjs/opus`, which needs a native build). Everything else is silently skipped by pnpm.
- **Pinned toolchain.** `engines.node`, `.npmrc` `engine-strict=true`, and `packageManager: pnpm@<x.y.z>` declare the expected runtime + package manager so contributors and CI converge on the same versions.
- **Reproducible CI.** Use `pnpm install --frozen-lockfile` in CI to fail the build on any lockfile drift.

The first three rules are enforced by [`scripts/check-deps.ts`](./scripts/check-deps.ts), which runs as part of `pnpm run test:all` and `pnpm run audit:deps`. Bumping a dep is a deliberate act: pick the new version, run `pnpm add <pkg>@<exact-version>`, and let the audit script gate the change.

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

## Operational notes

### Bot behavior

- The bot uses only the `Guilds` and `GuildVoiceStates` intents — no message-content intent required.
- Volume uses an inline volume transformer, so it works mid-track and survives skip.
- `/previous` re-queues the rewinded track at the front and pushes the currently playing track right after it, so chaining `/previous` rewinds further.

### First-install gotchas

- **`pnpm install` rejects Node < 20.19** because `.npmrc` has `engine-strict=true`. The Cursor IDE server ships its own bundled Node (currently 20.18.2) that's first on `PATH` inside a Cursor terminal — `pnpm` will silently pick that one and fail. Activate nvm or prepend `/usr/bin` so a real ≥ 20.19 Node wins. The system `node --version` should match `engines.node` before you install.
- **`apt update` returning non-zero kills downstream `&&` chains.** A broken extra apt repo (missing key, dead mirror, etc.) makes `sudo apt update && sudo apt install -y ffmpeg` skip the install silently. Fix or remove the offending file in `/etc/apt/sources.list.d/` before assuming a package install ran.
- **`@discordjs/opus` source-builds on Linux with no prebuilt for glibc ≥ 2.42** (Ubuntu 25.10, Debian trixie, etc.). The first install MUST set `CFLAGS=-Wno-error=implicit-function-declaration CXXFLAGS=…` to work around GCC 15 treating libopus's ARM NEON intrinsics path as a hard error.
- **`@discordjs/opus`'s native build needs `build-essential` and `node-gyp`** when the prebuilt path 404s. If you see `node-pre-gyp ERR! ... spawn node-gyp ENOENT`, install them: `sudo apt install -y build-essential node-gyp`.
- **A partial failed `pnpm install` leaves a half-installed `@discordjs/opus`** that subsequent installs treat as already done. If opus loads with `Cannot find module '.../opus.node'`, nuke and reinstall: `rm -rf node_modules/@discordjs/opus && pnpm install --force` (with the CFLAGS wrapper).
- **`packageManager: bun@…`** in `package.json` makes corepack refuse to dispatch pnpm. If you're migrating between runtimes, bootstrap pnpm from `/tmp` (`cd /tmp && corepack prepare pnpm@10 --activate`) before swapping the field.

### Runtime gotchas

- **Node doesn't auto-load `.env`** (Bun did). All `pnpm` scripts pass `--env-file=.env` to tsx, so `pnpm start`, `pnpm dev`, and `pnpm run deploy` Just Work — but `tsx src/index.ts` invoked directly will read no env at all and crash in `src/config.ts`.
- **One Discord token = one running bot process.** Starting `pnpm start` in a shell while pm2 is already running `levi` creates two clients with the same token; Discord's gateway will alternately disconnect both. After `pnpm pm2:start`, don't also `pnpm start` from a terminal.
- **`opus.node` is built against a specific Node ABI** (`process.versions.modules`). If you upgrade Node across a major version (20 → 22, 22 → 24), rebuild: `rm -rf node_modules && pnpm install` with the CFLAGS wrapper. The pm2 ecosystem file pins an explicit interpreter path so the running app never silently drifts.
- **yt-dlp goes stale fast.** YouTube ships extractor-breaking changes regularly. `sudo yt-dlp -U` from time to time, or wire a cron / systemd timer. Symptoms of staleness: every `/play` returns a generic "unable to extract uploader id" or "Sign in to confirm you're not a bot" error.
- **`DISCORD_GUILD_ID`** in `.env` is read by `src/deploy-commands.ts` only — setting it makes `pnpm run deploy` push commands to that one guild for instant updates. Leaving it unset deploys globally (up to an hour to propagate). The running bot ignores this var; it just affects command registration.

### pm2 gotchas

- **pm2 cluster mode + ESM (`"type": "module"`) bootstraps unreliably** — workers exit silently before app code runs. The ecosystem file pins `exec_mode: "fork"` for this reason; a Discord bot is one gateway connection per shard anyway, so cluster wouldn't help.
- **`pm2 save` snapshots every running app on the daemon**, not just `levi`. That's fine if your other apps are in a known-good state, but be aware: it's a global snapshot.
- **The `interpreter:` path in [`ecosystem.config.cjs`](./ecosystem.config.cjs) is absolute and machine-specific.** If you swap nvm versions, uninstall nvm, or move to a different host, update that line. The error is opaque (`spawn EACCES` or `command not found`) if it goes stale.
- **`pnpm pm2:*` scripts are scoped to `levi`.** They use either `pm2 start ecosystem.config.cjs --only levi` or address `levi` by name, so running them never touches other pm2-managed apps on the same daemon. Use raw `pm2 list` / `pm2 logs <name>` to interact with anything else.
- **Reboot persistence is a separate step.** `pm2 save` after the first `pnpm pm2:start`, and (on a brand-new machine) `pm2 startup` once so pm2 reattaches on boot.

### Bumping things

- **Deps.** Pick the new exact version, run `pnpm add <pkg>@<exact-version>`. The `.npmrc` quarantine refuses anything < 7 days old; the audit script (`pnpm run audit:deps`) refuses anything that isn't an exact registry pin. Both run as part of `pnpm run test:all`, so CI fails fast on drift.
- **Node major.** Bump `engines.node` in `package.json` and the `interpreter` path in `ecosystem.config.cjs` together. Then `rm -rf node_modules && pnpm install` with the CFLAGS wrapper so opus rebuilds against the new ABI. Re-run `pnpm run test:all` and a one-shot `pnpm start` before handing back to pm2.
- **pnpm itself.** Bump the version in `packageManager` (`pnpm@x.y.z`), commit, and run `corepack prepare pnpm@x.y.z --activate` on every host. Don't `npm install -g pnpm` — corepack will fight it.
- **Discord intents or scopes.** Changes to required permissions belong in [src/index.ts](src/index.ts) (`intents:` array) AND the OAuth install URL on the developer portal. The bot won't surface a clear error if a removed intent breaks a feature; you'll just see events stop firing.
