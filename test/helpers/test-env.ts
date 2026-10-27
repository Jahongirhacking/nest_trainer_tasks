import { loadEnvFile } from '../../src/database/database.config.js';

/**
 * Points the application's DB_* variables at the dedicated TEST database
 * (TEST_DB_* in `.env`) and refuses to continue if that does not look like a
 * disposable local test database. Destructive test setup (truncating tables,
 * resetting the schema) must never reach a development or production DB.
 */
export function applyTestEnv(): void {
  loadEnvFile();
  const e = process.env;
  const missing = ['HOST', 'PORT', 'USER', 'PASSWORD', 'NAME'].filter(
    (k) => !e[`TEST_DB_${k}`],
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing test database configuration: ${missing
        .map((k) => `TEST_DB_${k}`)
        .join(', ')}. See .env.example.`,
    );
  }
  if (!e.TEST_DB_NAME!.endsWith('_test')) {
    throw new Error('Refusing to run: TEST_DB_NAME must end with "_test".');
  }
  if (!['localhost', '127.0.0.1', '::1'].includes(e.TEST_DB_HOST!)) {
    throw new Error('Refusing to run: TEST_DB_HOST must be a local host.');
  }
  e.DB_HOST = e.TEST_DB_HOST;
  e.DB_PORT = e.TEST_DB_PORT;
  e.DB_USER = e.TEST_DB_USER;
  e.DB_PASSWORD = e.TEST_DB_PASSWORD;
  e.DB_NAME = e.TEST_DB_NAME;
}
