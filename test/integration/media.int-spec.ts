import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { DataSource, QueryFailedError } from 'typeorm';
import { createTestApp, resetDatabase } from '../helpers/app.js';

/**
 * `media` table constraints, checked straight against PostgreSQL (no HTTP, no
 * services): the database must protect itself even when application code is
 * wrong. They fail until your migration creates the table (Module F).
 */
const PG = {
  NOT_NULL: '23502',
  FOREIGN_KEY: '23503',
  UNIQUE: '23505',
  CHECK: '23514',
} as const;

async function sqlState(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(QueryFailedError);
    return (error as QueryFailedError & { driverError: { code: string } }).driverError
      .code;
  }
  return undefined;
}

describe('media table (PostgreSQL integration)', () => {
  let app: INestApplication<App>;
  let db: DataSource;
  let userId: number;
  let counter = 0;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DataSource);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    const rows: { id: number }[] = await db.query(
      `INSERT INTO "users" ("email", "passwordHash") VALUES ($1, 'hash') RETURNING "id"`,
      [`media-owner-${Date.now()}@example.com`],
    );
    userId = rows[0].id;
  });

  const row = (overrides: Record<string, unknown> = {}) => ({
    originalName: 'photo.jpg',
    storageKey: `key-${Date.now()}-${++counter}`,
    mimeType: 'image/jpeg',
    extension: 'jpg',
    size: 1234,
    category: 'IMAGE',
    status: 'ACTIVE',
    uploadedById: userId,
    ...overrides,
  });

  const insert = (values: Record<string, unknown>) => {
    const columns = Object.keys(values);
    return db.query(
      `INSERT INTO "media" (${columns.map((c) => `"${c}"`).join(', ')})
       VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      columns.map((c) => values[c]),
    );
  };

  it('has the documented columns', async () => {
    const rows: { column_name: string }[] = await db.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'media'`,
    );
    expect(rows.map((r) => r.column_name).sort()).toEqual(
      [
        'category', 'createdAt', 'extension', 'id', 'mimeType', 'originalName',
        'size', 'status', 'storageKey', 'updatedAt', 'uploadedById',
      ].sort(),
    );
  });

  it('accepts a valid row and fills id and timestamps itself', async () => {
    const [created] = await insert(row());
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);
  });

  it('defaults the status to UPLOADING', async () => {
    const values = row();
    delete (values as Record<string, unknown>).status;
    const [created] = await insert(values);
    expect(created.status).toBe('UPLOADING');
  });

  it('stores timestamps with a time zone', async () => {
    const rows: { column_name: string; data_type: string }[] = await db.query(
      `SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'media' AND column_name IN ('createdAt', 'updatedAt')`,
    );
    expect(rows).toHaveLength(2);
    for (const r of rows) expect(r.data_type).toBe('timestamp with time zone');
  });

  it('has no column that could hold the file content', async () => {
    const rows: { data_type: string }[] = await db.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name = 'media'`,
    );
    expect(rows.map((r) => r.data_type)).not.toContain('bytea');
  });

  it('requires a unique storageKey', async () => {
    await insert(row({ storageKey: 'same-key' }));
    expect(await sqlState(insert(row({ storageKey: 'same-key' })))).toBe(PG.UNIQUE);
  });

  it.each(['originalName', 'storageKey', 'mimeType', 'extension', 'size', 'category', 'uploadedById'])(
    'requires %s (NOT NULL)',
    async (column) => {
      expect(await sqlState(insert(row({ [column]: null })))).toBe(PG.NOT_NULL);
    },
  );

  it('has a real foreign key to users', async () => {
    expect(await sqlState(insert(row({ uploadedById: 999_999 })))).toBe(PG.FOREIGN_KEY);
  });

  it('rejects a negative size', async () => {
    expect(await sqlState(insert(row({ size: -1 })))).toBe(PG.CHECK);
  });

  it('rejects a status outside UPLOADING / ACTIVE / FAILED', async () => {
    expect(await sqlState(insert(row({ status: 'DELETED' })))).toBe(PG.CHECK);
  });

  it('rejects a category outside IMAGE / DOCUMENT', async () => {
    expect(await sqlState(insert(row({ category: 'VIDEO' })))).toBe(PG.CHECK);
  });

  it('has an index that serves "files of a user"', async () => {
    const rows: { indexdef: string }[] = await db.query(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'media'`,
    );
    expect(rows.some((r) => r.indexdef.includes('"uploadedById"'))).toBe(true);
  });

  it('does not let a user with files be removed silently (the ON DELETE rule is explicit)', async () => {
    await insert(row());
    const rows: { delete_rule: string }[] = await db.query(
      `SELECT rc.delete_rule
         FROM information_schema.referential_constraints rc
         JOIN information_schema.table_constraints tc
           ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'media'`,
    );
    expect(rows).toHaveLength(1);
    // Your choice, but never a silent CASCADE that orphans stored files.
    expect(['RESTRICT', 'NO ACTION']).toContain(rows[0].delete_rule);
  });
});
