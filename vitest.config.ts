import { defineConfig } from 'vitest/config';

// Root config: every workspace with its own vitest.config.ts becomes a test project,
// so `npm test` at the root runs the tests of all packages and apps at once.
export default defineConfig({
  test: {
    projects: [
      'packages/*/vitest.config.ts',
      'apps/*/vitest.config.ts',
      // Repo-level tests (tooling, scripts). Also keeps Vitest happy while no workspace exists yet.
      { test: { name: 'repo', include: ['scripts/**/*.test.ts'] } },
    ],
    passWithNoTests: true,
  },
});
