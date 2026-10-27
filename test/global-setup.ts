import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { applyTestEnv } from './helpers/test-env.js';

/**
 * Runs once before the DB-backed suites:
 *  1. resets the TEST database schema (only ever the *_test database, see
 *     applyTestEnv) and
 *  2. applies YOUR migrations from dist/migrations.
 *
 * The test schema therefore comes exclusively from your migrations, never
 * from `synchronize`. The `test:e2e` / `test:integration` scripts run
 * `pnpm build` first so dist/ is current.
 */
export default async function setup(): Promise<void> {
  applyTestEnv();

  const migrationsDir = join(process.cwd(), 'dist', 'migrations');
  const hasMigrations =
    existsSync(migrationsDir) &&
    readdirSync(migrationsDir).some((f) => f.endsWith('.js'));
  if (!hasMigrations) {
    throw new Error(
      'No compiled migrations found in dist/migrations. Create your schema ' +
        'migration in src/migrations, then run `pnpm build` ' +
        '(see ASSIGNMENT.md, "Migrations").',
    );
  }

  const e = process.env;
  const dataSource = new DataSource({
    type: 'postgres',
    host: e.DB_HOST,
    port: Number(e.DB_PORT),
    username: e.DB_USER,
    password: e.DB_PASSWORD,
    database: e.DB_NAME,
    migrations: [join(migrationsDir, '*.js')],
  });
  try {
    await dataSource.initialize();
  } catch (error) {
    throw new Error(
      `Cannot connect to the test database (${e.DB_HOST}:${e.DB_PORT}). ` +
        `Start it with \`docker compose up -d postgres-test\`. ` +
        `Cause: ${(error as Error).message}`,
    );
  }
  try {
    // Drops every table of the *_test database, then rebuilds via migrations.
    await dataSource.dropDatabase();
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}
