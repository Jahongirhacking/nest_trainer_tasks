import { QueryFailedError } from 'typeorm';

type Row = Record<string, any>;

/**
 * In-memory stand-in for the User repository, used ONLY by unit tests.
 * Mimics the unique email constraint (SQLSTATE 23505).
 *
 * Supported API: create, save, insert, find, findBy, findOne, findOneBy,
 * exists, existsBy, count, countBy. `where` supports plain equality.
 */
export class FakeUserRepository {
  rows: Row[] = [];
  private nextId = 1;
  /** Hook for tests: runs before every write. */
  beforeWrite?: () => void;

  private matches(row: Row, where: Row | undefined): boolean {
    if (!where) return true;
    return Object.entries(where).every(
      ([key, expected]) => expected === undefined || row[key] === expected,
    );
  }

  private persist(input: Row): Row {
    this.beforeWrite?.();
    if (this.rows.some((r) => r.email === input.email && r.id !== input.id)) {
      throw new QueryFailedError(
        'fake query',
        [],
        Object.assign(new Error('duplicate key value'), { code: '23505' }),
      );
    }
    const now = new Date();
    const row: Row = {
      ...input,
      id: this.nextId++,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return Object.assign(input, row);
  }

  create = vi.fn((partial: Row = {}) => ({ ...partial }));
  save = vi.fn(async (entity: Row) => this.persist(entity));
  insert = vi.fn(async (entity: Row) => {
    const saved = this.persist({ ...entity });
    return {
      identifiers: [{ id: saved.id }],
      generatedMaps: [saved],
      raw: [saved],
    };
  });
  find = vi.fn(async (options?: Row) =>
    this.rows
      .filter((r) => this.matches(r, options?.where))
      .map((r) => ({ ...r })),
  );
  findBy = vi.fn(async (where: Row) => this.find({ where }));
  findOne = vi.fn(async (options?: Row) => {
    const row = this.rows.find((r) => this.matches(r, options?.where));
    return row ? { ...row } : null;
  });
  findOneBy = vi.fn(async (where: Row) => this.findOne({ where }));
  count = vi.fn(
    async (options?: Row) =>
      this.rows.filter((r) => this.matches(r, options?.where)).length,
  );
  countBy = vi.fn(async (where: Row) => this.count({ where }));
  exists = vi.fn(async (options?: Row) => (await this.count(options)) > 0);
  existsBy = vi.fn(async (where: Row) => (await this.count({ where })) > 0);
}
