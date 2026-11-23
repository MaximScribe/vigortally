import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    // Every test file boots an in-memory Postgres (PGlite, WebAssembly) and runs the
    // migrations. That takes a few seconds when all workspaces test in parallel, so the
    // defaults (5 s per test, 10 s per hook) are too tight on slower machines.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
