/**
 * Test preload — runs before any test file. Stubs the env vars that
 * `src/config.ts` validates at import time so tests can import modules
 * that transitively depend on it. Real production code keeps its
 * fail-fast behavior.
 */
process.env.DISCORD_TOKEN ||= "test-stub";
process.env.DISCORD_CLIENT_ID ||= "test-stub";
