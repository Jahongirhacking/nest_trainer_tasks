import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

const REQUIRED_VARIABLES = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
] as const;

/**
 * Loads `.env` into `process.env` (Node's built-in loader; no dotenv package).
 * Variables that are already set are NOT overwritten, so real environment
 * variables (CI, containers, the test setup) always win over the file.
 */
export function loadEnvFile(path = '.env'): void {
  try {
    process.loadEnvFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

/**
 * Builds the PostgreSQL connection options from environment variables.
 *
 * - Fails fast with a readable message (variable NAMES only, never values)
 *   when configuration is missing.
 * - `synchronize` is hard-wired to `false`: the schema is created by
 *   migrations only (see ASSIGNMENT.md, "Migrations").
 * - `migrationsRun` is `false`: migrations are applied explicitly with the
 *   TypeORM CLI, never silently at application startup.
 */
export function buildTypeOrmOptions(
  env: NodeJS.ProcessEnv = process.env,
): TypeOrmModuleOptions {
  const missing = REQUIRED_VARIABLES.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Database configuration is incomplete. Missing environment variables: ` +
        `${missing.join(', ')}. Copy .env.example to .env and fill it in.`,
    );
  }

  const port = Number(env.DB_PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('DB_PORT must be a valid TCP port number.');
  }

  return {
    type: 'postgres',
    host: env.DB_HOST,
    port,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    // Entities registered with TypeOrmModule.forFeature([...]) are picked up
    // automatically.
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
    logging: env.DB_LOGGING === 'true' ? ['query', 'error'] : ['error'],
    retryAttempts: Number(env.DB_RETRY_ATTEMPTS ?? 3),
    retryDelay: Number(env.DB_RETRY_DELAY_MS ?? 1000),
  };
}
