import { QueryFailedError } from 'typeorm';

type Row = Record<string, any>;

/**
 * Minimal in-memory stand-in for a TypeORM repository, used ONLY by the
 * Task 5 tests. Supported: create, save, find, findOne, findOneBy, remove,
 * count. `where` supports plain equality. Optional unique columns raise the
 * same error PostgreSQL does (SQLSTATE 23505).
 */
export class InMemoryRepository {
  rows: Row[] = [];
  private nextId = 1;

  constructor(private readonly unique: string[] = []) {}

  private matches(row: Row, where?: Row): boolean {
    if (!where) return true;
    return Object.entries(where).every(
      ([key, expected]) => expected === undefined || row[key] === expected,
    );
  }

  /** Test helper: inserts a row and returns it (keeps a given `id`). */
  seed(row: Row): Row {
    const stored: Row = { createdAt: new Date(), updatedAt: new Date(), ...row };
    if (stored.id === undefined) stored.id = this.nextId;
    this.nextId = Math.max(this.nextId, stored.id + 1);
    this.rows.push(stored);
    return stored;
  }

  create = vi.fn((partial: Row = {}) => ({ ...partial }));

  save = vi.fn(async (entity: Row) => {
    const existing = this.rows.find((r) => r.id === entity.id);
    for (const column of this.unique) {
      if (
        this.rows.some((r) => r[column] === entity[column] && r.id !== entity.id)
      ) {
        throw new QueryFailedError(
          'fake query',
          [],
          Object.assign(new Error('duplicate key value'), { code: '23505' }),
        );
      }
    }
    if (existing) {
      Object.assign(existing, entity, { updatedAt: new Date() });
      return Object.assign(entity, existing);
    }
    const stored = this.seed({ ...entity, id: undefined });
    return Object.assign(entity, stored);
  });

  find = vi.fn(async (options?: Row) =>
    this.rows
      .filter((r) => this.matches(r, options?.where))
      .sort((a, b) => a.id - b.id)
      .map((r) => ({ ...r })),
  );

  findOne = vi.fn(async (options: Row) => {
    const row = this.rows.find((r) => this.matches(r, options?.where));
    return row ? { ...row } : null;
  });

  findOneBy = vi.fn(async (where: Row) => this.findOne({ where }));

  count = vi.fn(
    async (options?: Row) =>
      this.rows.filter((r) => this.matches(r, options?.where)).length,
  );

  remove = vi.fn(async (entity: Row) => {
    const index = this.rows.findIndex((r) => r.id === entity.id);
    if (index >= 0) this.rows.splice(index, 1);
    return entity;
  });
}
