import { QueryFailedError } from 'typeorm';

/**
 * In-memory stand-ins for the TypeORM repositories, used ONLY by unit tests.
 * They mimic the parts of PostgreSQL the services rely on:
 *   - unique project names  -> QueryFailedError, SQLSTATE 23505
 *   - tasks need a project  -> QueryFailedError, SQLSTATE 23503
 *   - projects with tasks cannot be deleted -> SQLSTATE 23503
 *
 * Supported Repository API (use any of these in your services):
 *   create, save, insert, find, findBy, findOne, findOneBy, findOneOrFail,
 *   findOneByOrFail, count, countBy, exists, existsBy, update, delete,
 *   remove, merge
 * `where` supports plain equality, `{ project: { id } }` / `{ projectId }`,
 * `Not(...)`/other operators are NOT supported (use the e2e tests for those).
 * Every method is a vi.fn() spy: `repo.method.mock.calls` shows the usage.
 */

type Row = Record<string, any>;

const pgError = (code: string, message: string) =>
  new QueryFailedError('fake query', [], Object.assign(new Error(message), { code }));

export class FakeDatabase {
  projects: Row[] = [];
  tasks: Row[] = [];
  nextProjectId = 1;
  nextTaskId = 1;
  /** Hook for tests: runs before every write (e.g. to simulate races). */
  beforeWrite?: () => void;
}

type Kind = 'project' | 'task';

export class FakeRepository {
  constructor(
    readonly db: FakeDatabase,
    private readonly kind: Kind,
  ) {}

  get rows(): Row[] {
    return this.kind === 'project' ? this.db.projects : this.db.tasks;
  }

  private matches(row: Row, where: Row | Row[] | undefined): boolean {
    if (!where) return true;
    if (Array.isArray(where)) return where.some((w) => this.matches(row, w));
    return Object.entries(where).every(([key, expected]) => {
      if (expected === undefined) return true;
      if (key === 'project' && typeof expected === 'object')
        return row.projectId === (expected as Row).id;
      return row[key] === expected;
    });
  }

  private withRelations(row: Row, options?: Row): Row {
    const copy = { ...row };
    if (this.kind === 'project' && options?.relations) {
      const rel = options.relations;
      const wantsTasks = Array.isArray(rel) ? rel.includes('tasks') : rel.tasks;
      if (wantsTasks)
        copy.tasks = this.db.tasks.filter((t) => t.projectId === row.id);
    }
    return copy;
  }

  private checkWrite(row: Row, isInsert: boolean): void {
    this.db.beforeWrite?.();
    if (this.kind === 'project') {
      const clash = this.db.projects.some(
        (p) => p.name === row.name && p.id !== row.id,
      );
      if (clash) throw pgError('23505', 'duplicate key value');
    } else {
      const projectId = row.projectId ?? row.project?.id;
      if (!this.db.projects.some((p) => p.id === projectId))
        throw pgError('23503', 'violates foreign key constraint');
    }
    void isInsert;
  }

  private persist(input: Row): Row {
    const existing = input.id
      ? this.rows.find((r) => r.id === input.id)
      : undefined;
    const now = new Date();
    if (existing) {
      const next = { ...existing, ...input, updatedAt: now };
      this.checkWrite(next, false);
      Object.assign(existing, next);
      return Object.assign(input, existing);
    }
    const row: Row = { description: null, ...input };
    if (this.kind === 'task') {
      row.completed = row.completed ?? false;
      row.projectId = row.projectId ?? row.project?.id;
      delete row.project;
    }
    this.checkWrite(row, true);
    row.id =
      this.kind === 'project' ? this.db.nextProjectId++ : this.db.nextTaskId++;
    row.createdAt = now;
    row.updatedAt = now;
    this.rows.push(row);
    return Object.assign(input, row);
  }

  create = vi.fn((partial: Row | Row[] = {}) =>
    Array.isArray(partial) ? partial.map((p) => ({ ...p })) : { ...partial },
  );
  merge = vi.fn((target: Row, ...sources: Row[]) =>
    Object.assign(target, ...sources),
  );
  save = vi.fn(async (entity: Row | Row[]) =>
    Array.isArray(entity) ? entity.map((e) => this.persist(e)) : this.persist(entity),
  );
  insert = vi.fn(async (entity: Row | Row[]) => {
    const saved = (Array.isArray(entity) ? entity : [entity]).map((e) =>
      this.persist({ ...e }),
    );
    return {
      identifiers: saved.map((s) => ({ id: s.id })),
      generatedMaps: saved,
      raw: saved,
    };
  });
  find = vi.fn(async (options?: Row) =>
    this.rows
      .filter((r) => this.matches(r, options?.where))
      .sort((a, b) => a.id - b.id)
      .map((r) => this.withRelations(r, options)),
  );
  findBy = vi.fn(async (where: Row) => this.find({ where }));
  findOne = vi.fn(async (options: Row) => {
    const row = this.rows.find((r) => this.matches(r, options?.where));
    return row ? this.withRelations(row, options) : null;
  });
  findOneBy = vi.fn(async (where: Row) => this.findOne({ where }));
  findOneOrFail = vi.fn(async (options: Row) => {
    const row = await this.findOne(options);
    if (!row) throw new Error('EntityNotFoundError');
    return row;
  });
  findOneByOrFail = vi.fn(async (where: Row) => this.findOneOrFail({ where }));
  count = vi.fn(
    async (options?: Row) =>
      this.rows.filter((r) => this.matches(r, options?.where)).length,
  );
  countBy = vi.fn(async (where: Row) => this.count({ where }));
  exists = vi.fn(async (options?: Row) => (await this.count(options)) > 0);
  existsBy = vi.fn(async (where: Row) => (await this.count({ where })) > 0);
  update = vi.fn(async (criteria: number | Row, partial: Row) => {
    const where = typeof criteria === 'number' ? { id: criteria } : criteria;
    const targets = this.rows.filter((r) => this.matches(r, where));
    targets.forEach((t) => this.persist({ ...t, ...partial, id: t.id }));
    return { affected: targets.length, raw: [], generatedMaps: [] };
  });
  delete = vi.fn(async (criteria: number | Row) => {
    this.db.beforeWrite?.();
    const where = typeof criteria === 'number' ? { id: criteria } : criteria;
    const targets = this.rows.filter((r) => this.matches(r, where));
    targets.forEach((t) => this.removeRow(t));
    return { affected: targets.length, raw: [] };
  });
  remove = vi.fn(async (entity: Row) => {
    this.db.beforeWrite?.();
    const row = this.rows.find((r) => r.id === entity.id);
    if (row) this.removeRow(row);
    return entity;
  });

  private removeRow(row: Row): void {
    if (
      this.kind === 'project' &&
      this.db.tasks.some((t) => t.projectId === row.id)
    )
      throw pgError('23503', 'violates foreign key constraint');
    this.rows.splice(this.rows.indexOf(row), 1);
  }
}

export function createFakeRepositories() {
  const db = new FakeDatabase();
  return {
    db,
    projects: new FakeRepository(db, 'project'),
    tasks: new FakeRepository(db, 'task'),
  };
}
