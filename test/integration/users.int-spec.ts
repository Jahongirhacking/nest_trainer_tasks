import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { DataSource, QueryFailedError } from 'typeorm';
import { createTestApp, resetDatabase } from '../helpers/app.js';

/**
 * `users` table constraints, checked straight against PostgreSQL (no HTTP, no
 * DTOs): constraints must hold even when application code is wrong.
 */
const PG = { NOT_NULL: '23502', UNIQUE: '23505' } as const;

async function sqlState(
  promise: Promise<unknown>,
): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(QueryFailedError);
    return (error as QueryFailedError & { driverError: { code: string } })
      .driverError.code;
  }
  return undefined;
}

describe('users table (PostgreSQL integration)', () => {
  let app: INestApplication<App>;
  let db: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DataSource);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(app);
  });

  const insert = (email: string | null, hash: string | null = 'hash') =>
    db.query(`INSERT INTO "users" ("email", "passwordHash") VALUES ($1, $2)`, [
      email,
      hash,
    ]);

  it('has the documented columns', async () => {
    const rows: { column_name: string }[] = await db.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'users'`,
    );
    expect(rows.map((r) => r.column_name).sort()).toEqual(
      ['createdAt', 'email', 'id', 'passwordHash', 'updatedAt'].sort(),
    );
  });

  it('generates id and timestamps in the database', async () => {
    await insert('a@example.com');
    const [row] = await db.query(`SELECT * FROM "users"`);
    expect(typeof row.id).toBe('number');
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
  });

  it('enforces a unique email at the database level', async () => {
    await insert('dup@example.com');
    expect(await sqlState(insert('dup@example.com'))).toBe(PG.UNIQUE);
  });

  it('requires an email and a password hash', async () => {
    expect(await sqlState(insert(null))).toBe(PG.NOT_NULL);
    expect(await sqlState(insert('a@example.com', null))).toBe(PG.NOT_NULL);
  });

  it('stores timestamps with a time zone (no local-time drift)', async () => {
    const [row] = await db.query(
      `SELECT data_type FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'users'
          AND column_name = 'createdAt'`,
    );
    expect(row.data_type).toBe('timestamp with time zone');
  });

  it('keeps the Project/Task tables untouched', async () => {
    const rows: { table_name: string }[] = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()`,
    );
    const names = rows.map((r) => r.table_name);
    expect(names).toEqual(
      expect.arrayContaining(['projects', 'tasks', 'users']),
    );
  });
});
