// pm2 ecosystem file for this app only. Every pm2:* script in
// package.json references `--only levi` (or addresses `levi` directly)
// so other pm2 processes on this machine are never touched by
// start / stop / restart / delete.
//
// Must be CommonJS (.cjs) because package.json sets "type": "module".
module.exports = {
  apps: [
    {
      name: "levi",

      // TypeScript source is loaded on the fly via tsx — no build step.
      // tsx is a devDependency and its esm/cjs loader is registered
      // through `--import tsx` in node_args below.
      script: "src/index.ts",

      // Pin the interpreter to the nvm Node that satisfies engines.node
      // (>=20.19). The pm2 daemon itself can run under any Node version
      // (it runs the rest of your apps too); this line guarantees Levi
      // always boots under the version it was tested against, even if
      // the daemon's default Node changes.
      interpreter: "/home/harshitrvpi/.nvm/versions/node/v24.14.1/bin/node",

      // Two things at once:
      //  * `--import tsx` registers tsx's ESM+CJS loader so we can run
      //    .ts source without a precompile step.
      //  * `--env-file=.env` is Node's native dotenv loader (>=20.6).
      //    Bun used to auto-load .env; under Node it has to be explicit.
      node_args: "--import tsx --env-file=.env",

      cwd: __dirname,

      // Fork mode (single Node process). pm2 cluster mode + ESM
      // ("type": "module" in package.json) bootstraps unreliably —
      // workers die silently in pm2's CommonJS wrapper before the app
      // code runs. A Discord bot is fundamentally a single gateway
      // connection per shard anyway; cluster wouldn't help.
      exec_mode: "fork",
      instances: 1,

      autorestart: true,
      watch: false,
      max_memory_restart: "500M",

      // Restart backoff: a crash loop shouldn't hammer Discord's
      // gateway (which will rate-limit / ban on excessive reconnects).
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 2000,

      // Logs land under ./logs (already gitignored). pm2 creates the dir.
      out_file: "logs/levi.out.log",
      error_file: "logs/levi.err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
