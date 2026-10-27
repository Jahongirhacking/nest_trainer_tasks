import { defineConfig } from 'vitest/config';

// E2E tests: `test/*.e2e-spec.ts`. Real app + REAL PostgreSQL test database
// (TEST_DB_* in .env). The legacy Task 1/2 in-memory suites under
// test/legacy are not run any more (see ASSIGNMENT.md, "Regression").
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup-env.ts'],
    // All files share one database: run them one after another.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
