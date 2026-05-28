/**
 * Supply-chain audit: enforce that every dependency is an exact, pinned
 * version coming from the npm registry. Rejects:
 *
 *   - any range specifier (^, ~, >, <, ||, x, *)
 *   - the floating tags "latest" / "next"
 *   - exotic protocols (file:, link:, git:, github:, http(s):, workspace:,
 *     npm: aliases, patch:, portal:, bundle:)
 *
 * Why: pinned versions + a registry-only policy make the lockfile the single
 * source of truth and remove the most common supply-chain footguns
 * (silent transitive bumps, github tarballs that can be rewritten,
 * file/link paths that escape review).
 *
 * Lifecycle-script defence and the minimum-release-age quarantine live in
 * bunfig.toml + package.json#trustedDependencies; this script only checks
 * what's declared in package.json.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

type DepMap = Record<string, string>;

interface PackageJson {
  name?: string;
  dependencies?: DepMap;
  devDependencies?: DepMap;
  optionalDependencies?: DepMap;
  peerDependencies?: DepMap;
}

const EXACT_SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const EXOTIC_PROTOCOLS = [
  "file:",
  "link:",
  "git:",
  "git+",
  "github:",
  "http:",
  "https:",
  "workspace:",
  "npm:",
  "patch:",
  "portal:",
  "bundle:",
];

const FLOATING_TAGS = new Set(["latest", "next", "*", ""]);

// Sections that must be exact, registry-only pins. peerDependencies are
// intentionally excluded: peer ranges are a contract for downstream
// consumers (libraries) and naturally need ranges. This project is private
// today, but we don't want the policy to break if it ever becomes a library.
const PINNED_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

function findExoticProtocol(spec: string): string | undefined {
  return EXOTIC_PROTOCOLS.find((p) => spec.startsWith(p));
}

function check(pkg: PackageJson): string[] {
  const errors: string[] = [];

  for (const section of PINNED_SECTIONS) {
    const deps = pkg[section];
    if (!deps) continue;

    for (const [name, spec] of Object.entries(deps)) {
      const exotic = findExoticProtocol(spec);
      if (exotic) {
        errors.push(
          `${section}.${name}: exotic protocol "${exotic}" is not allowed (use the npm registry)`,
        );
        continue;
      }

      if (FLOATING_TAGS.has(spec.trim())) {
        errors.push(
          `${section}.${name}: floating tag "${spec}" is not allowed (pin an exact version)`,
        );
        continue;
      }

      if (!EXACT_SEMVER.test(spec)) {
        errors.push(
          `${section}.${name}: "${spec}" is not an exact version (no ^, ~, ranges, or wildcards)`,
        );
      }
    }
  }

  // Peer deps still get the exotic-protocol check, just not the exact-pin one.
  for (const [name, spec] of Object.entries(pkg.peerDependencies ?? {})) {
    const exotic = findExoticProtocol(spec);
    if (exotic) {
      errors.push(
        `peerDependencies.${name}: exotic protocol "${exotic}" is not allowed`,
      );
    }
  }

  return errors;
}

function main(): void {
  const pkgPath = resolve(process.cwd(), "package.json");
  const lockPath = resolve(process.cwd(), "bun.lock");

  if (!existsSync(pkgPath)) {
    console.error("package.json not found");
    process.exit(1);
  }

  if (!existsSync(lockPath)) {
    console.error(
      "bun.lock not found — commit the text lockfile so installs are reproducible",
    );
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as PackageJson;
  const errors = check(pkg);

  if (errors.length > 0) {
    console.error("Dependency policy violations:\n");
    for (const e of errors) console.error(`  - ${e}`);
    console.error(
      `\n${errors.length} violation(s). Pin versions exactly and use the npm registry only.`,
    );
    process.exit(1);
  }

  const counts = PINNED_SECTIONS.map((s) => {
    const n = Object.keys(pkg[s] ?? {}).length;
    return n > 0 ? `${n} ${s}` : null;
  })
    .filter(Boolean)
    .join(", ");

  console.log(`Dependency policy OK (${counts}).`);
}

main();
