import { defineConfig } from 'vitest/config';

// DATABASE INTEGRATION tests: `test/integration/*.int-spec.ts`.
// They verify constraints and persistence directly against PostgreSQL.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/integration/*.int-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup-env.ts'],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
