/**
 * Conventional Commits with a few project-friendly tweaks.
 * @see https://www.conventionalcommits.org
 *
 * Examples:
 *   feat(play): support spotify URLs
 *   fix(queue): rewind handler no longer double-records history
 *   chore(deps): bump discord.js to 14.27
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Allow longer subject lines for descriptive commits (default 72).
    "header-max-length": [2, "always", 100],
    // Subject can be any case (e.g. acronyms like `fix: yt-dlp...`).
    "subject-case": [0],
  },
};
