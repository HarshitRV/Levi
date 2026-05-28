/**
 * Bridge the @discordjs/opus prebuild ABI mismatch under Bun.
 *
 * @discordjs/opus uses node-pre-gyp, which keys prebuilds by Node's
 * `process.versions.modules` value (e.g. v127 for Node 22, v137 for Node 24
 * / Bun 1.3+). The prebuild filename also includes that tag, and Bun
 * matches it exactly at load time.
 *
 * Two things conspire to break us:
 *   1. The newest upstream prebuild shipped for @discordjs/opus@0.10.0 is
 *      node-v127 — there is no v137 prebuild on GitHub.
 *   2. When node-pre-gyp falls back to a source build, it shells out to
 *      whatever `node` is on PATH, so the resulting prebuild is tagged
 *      with that node's modules version (often v131 from Node 22) rather
 *      than Bun's v137.
 *
 * The binary itself is NAPI v3, which is ABI-stable across Node versions
 * by design — the mismatch is purely in the filename node-pre-gyp picked.
 * This script finds any existing NAPI-v3 prebuild for the current platform
 * and symlinks it under the path Bun is going to look for. Safe to run
 * repeatedly; no-op when the matching directory already exists.
 */

import { readdirSync, existsSync, symlinkSync, statSync } from "node:fs";
import { join } from "node:path";

const PREBUILD_DIR = join(
  process.cwd(),
  "node_modules",
  "@discordjs",
  "opus",
  "prebuild",
);

function main(): void {
  if (!existsSync(PREBUILD_DIR)) {
    // @discordjs/opus install script hasn't (or won't) produce a prebuild
    // dir — nothing for us to do. Don't fail install on this; the runtime
    // error will surface clearly if opus is actually needed.
    return;
  }

  const modulesVersion = process.versions.modules;
  const platform = process.platform;
  const arch = process.arch;

  // Filename shape: node-v{modules}-napi-v{napi}-{platform}-{arch}-{libc}-{libcVersion}
  const expectedPrefix = `node-v${modulesVersion}-napi-v3-${platform}-${arch}-`;

  const entries = readdirSync(PREBUILD_DIR);

  const alreadyCorrect = entries.some((e) => e.startsWith(expectedPrefix));
  if (alreadyCorrect) return;

  // Find any other NAPI-v3 prebuild for this platform+arch we can borrow.
  const sourceDir = entries.find((e) =>
    new RegExp(`^node-v\\d+-napi-v3-${platform}-${arch}-`).test(e),
  );

  if (!sourceDir) {
    console.warn(
      `[fix-opus-abi] No NAPI-v3 prebuild found for ${platform}-${arch}; @discordjs/opus may fail to load at runtime.`,
    );
    return;
  }

  // Reuse the libc / libcVersion suffix from the existing dir so the
  // symlink target matches the format Bun expects.
  const suffix = sourceDir.slice(sourceDir.indexOf("-napi-v3-") + 9); // platform-arch-libc-libcVersion
  const targetName = `node-v${modulesVersion}-napi-v3-${suffix}`;
  const targetPath = join(PREBUILD_DIR, targetName);

  if (existsSync(targetPath)) return;

  symlinkSync(sourceDir, targetPath, "dir");
  const target = statSync(join(PREBUILD_DIR, sourceDir)).isDirectory()
    ? "dir"
    : "file";
  console.log(
    `[fix-opus-abi] Linked ${targetName} -> ${sourceDir} (${target})`,
  );
}

main();
