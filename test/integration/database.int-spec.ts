import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { DataSource, QueryFailedError, type EntityManager } from 'typeorm';
import { Project } from '../../src/projects/entities/project.entity.js';
import { Task } from '../../src/tasks/entities/task.entity.js';
import {
  createProject,
  createTask,
  createTestApp,
  http,
  resetDatabase,
} from '../helpers/app.js';

/**
 * Database-level behaviour, checked against a REAL PostgreSQL test database.
 * Violations are provoked by writing straight through TypeORM (bypassing the
 * HTTP layer and every DTO), because constraints must hold even when the
 * application code is wrong.
 */
const PG = {
  NOT_NULL: '23502',
  FOREIGN_KEY: '23503',
  UNIQUE: '23505',
  TOO_LONG: '22001',
} as const;

async function sqlState(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(QueryFailedError);
    return (error as QueryFailedError & { driverError: { code: string } })
      .driverError.code;
  }
  return undefined;
}

describe('PostgreSQL integration', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let manager: EntityManager;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    manager = dataSource.manager;
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(app);
  });

  describe('schema and configuration', () => {
    it('is created by migrations, not by synchronize', async () => {
      expect(dataSource.options.synchronize).toBeFalsy();
      const rows = await dataSource.query('SELECT count(*)::int AS n FROM migrations');
      expect(rows[0].n).toBeGreaterThanOrEqual(1);
    });

    it('Project maps the required columns', () => {
      const columns = dataSource.getMetadata(Project).columns.map((c) => c.propertyName);
      expect(columns).toEqual(
        expect.arrayContaining(['id', 'name', 'description', 'createdAt', 'updatedAt']),
      );
    });

    it('Task maps the required columns', () => {
      const columns = dataSource.getMetadata(Task).columns.map((c) => c.propertyName);
      expect(columns).toEqual(
        expect.arrayContaining([
          'id', 'title', 'description', 'completed', 'projectId', 'createdAt', 'updatedAt',
        ]),
      );
    });

    it('Project has a One-to-Many to Task and Task a Many-to-One to Project', () => {
      const projectMeta = dataSource.getMetadata(Project);
      const taskMeta = dataSource.getMetadata(Task);
      const oneToMany = projectMeta.relations.find((r) => r.isOneToMany);
      const manyToOne = taskMeta.relations.find((r) => r.isManyToOne);
      expect(oneToMany?.inverseEntityMetadata.target).toBe(Task);
      expect(manyToOne?.inverseEntityMetadata.target).toBe(Project);
    });

    it('has a real foreign key task -> project that does not cascade', async () => {
      const taskTable = dataSource.getMetadata(Task).tableName;
      const projectTable = dataSource.getMetadata(Project).tableName;
      const rows: { confdeltype: string }[] = await dataSource.query(
        `SELECT confdeltype FROM pg_constraint
          WHERE contype = 'f' AND conrelid = $1::regclass AND confrelid = $2::regclass`,
        [`"${taskTable}"`, `"${projectTable}"`],
      );
      expect(rows.length).toBeGreaterThanOrEqual(1);
      // 'a' = NO ACTION, 'r' = RESTRICT. Never 'c' (CASCADE), 'n' or 'd'.
      rows.forEach((r) => expect(['a', 'r']).toContain(r.confdeltype));
    });

    it('does not store project data inside the task table', () => {
      const columns = dataSource.getMetadata(Task).columns.map((c) => c.propertyName);
      expect(columns).not.toContain('projectName');
      expect(columns).not.toContain('project_name');
    });
  });

  describe('constraints (bypassing the HTTP layer)', () => {
    it('rejects duplicate project names', async () => {
      await manager.insert(Project, { name: 'Unique' });
      expect(await sqlState(manager.insert(Project, { name: 'Unique' }))).toBe(PG.UNIQUE);
      expect(await manager.countBy(Project, { name: 'Unique' })).toBe(1);
    });

    it('rejects a project without a name', async () => {
      expect(await sqlState(manager.insert(Project, {} as any))).toBe(PG.NOT_NULL);
    });

    it('rejects a project name longer than 100 characters', async () => {
      expect(await sqlState(manager.insert(Project, { name: 'a'.repeat(101) }))).toBe(PG.TOO_LONG);
    });

    it('rejects a project description longer than 500 characters', async () => {
      expect(
        await sqlState(manager.insert(Project, { name: 'P', description: 'a'.repeat(501) })),
      ).toBe(PG.TOO_LONG);
    });

    it('rejects a task that references a nonexistent project', async () => {
      expect(
        await sqlState(manager.insert(Task, { title: 'Orphan', projectId: 2_000_000_000 })),
      ).toBe(PG.FOREIGN_KEY);
      expect(await manager.count(Task)).toBe(0);
    });

    it('rejects a task without a project', async () => {
      expect(await sqlState(manager.insert(Task, { title: 'No project' } as any))).toBe(
        PG.NOT_NULL,
      );
    });

    it('rejects a task without a title or with a title over 100 characters', async () => {
      const { id } = (await manager.save(Project, { name: 'P' })) as Project;
      expect(await sqlState(manager.insert(Task, { projectId: id } as any))).toBe(PG.NOT_NULL);
      expect(
        await sqlState(manager.insert(Task, { projectId: id, title: 'a'.repeat(101) })),
      ).toBe(PG.TOO_LONG);
    });

    it('defaults completed to false', async () => {
      const { id } = (await manager.save(Project, { name: 'P' })) as Project;
      const task = (await manager.save(Task, { title: 'T', projectId: id })) as Task;
      const stored = await manager.findOneByOrFail(Task, { id: task.id });
      expect(stored.completed).toBe(false);
    });

    it('rejects deleting a project that still has tasks, at database level', async () => {
      const { id } = (await manager.save(Project, { name: 'P' })) as Project;
      await manager.save(Task, { title: 'T', projectId: id });
      expect(await sqlState(manager.delete(Project, { id }))).toBe(PG.FOREIGN_KEY);
      expect(await manager.countBy(Project, { id })).toBe(1);
      expect(await manager.countBy(Task, { projectId: id })).toBe(1);
    });

    it('deletes an empty project', async () => {
      const { id } = (await manager.save(Project, { name: 'P' })) as Project;
      await manager.delete(Project, { id });
      expect(await manager.countBy(Project, { id })).toBe(0);
    });

    it('keeps the project when one of its tasks is deleted', async () => {
      const { id } = (await manager.save(Project, { name: 'P' })) as Project;
      const task = (await manager.save(Task, { title: 'T', projectId: id })) as Task;
      await manager.delete(Task, { id: task.id });
      expect(await manager.countBy(Project, { id })).toBe(1);
    });
  });

  describe('persistence and association (through the API)', () => {
    it('a created project is stored in the database', async () => {
      const project = await createProject(app, { name: 'Stored', description: 'd' });
      const row = await manager.findOneByOrFail(Project, { id: project.id });
      expect(row).toMatchObject({ name: 'Stored', description: 'd' });
    });

    it('a created task is stored and linked to its project', async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id, { title: 'Linked' });
      const row = await manager.findOneByOrFail(Task, { id: task.id });
      expect(row.title).toBe('Linked');
      expect(row.projectId).toBe(project.id);
    });

    it('a project can have several tasks', async () => {
      const project = await createProject(app);
      await createTask(app, project.id);
      await createTask(app, project.id);
      await createTask(app, project.id);
      expect(await manager.countBy(Task, { projectId: project.id })).toBe(3);
    });

    it('different projects never share tasks', async () => {
      const a = await createProject(app);
      const b = await createProject(app);
      await createTask(app, a.id);
      await createTask(app, a.id);
      await createTask(app, b.id);
      expect(await manager.countBy(Task, { projectId: a.id })).toBe(2);
      expect(await manager.countBy(Task, { projectId: b.id })).toBe(1);
      const listedA = (await http(app).get(`/projects/${a.id}/tasks`).expect(200)).body;
      expect(listedA).toHaveLength(2);
    });

    it('data survives an application restart', async () => {
      const project = await createProject(app, { name: 'Durable' });
      const task = await createTask(app, project.id, { title: 'Still here' });

      await app.close();
      app = await createTestApp();
      dataSource = app.get(DataSource);
      manager = dataSource.manager;

      const projects = (await http(app).get('/projects').expect(200)).body;
      expect(projects.map((p: { name: string }) => p.name)).toContain('Durable');
      const reloaded = (await http(app).get(`/tasks/${task.id}`).expect(200)).body;
      expect(reloaded).toMatchObject({ title: 'Still here', projectId: project.id });
    });
  });

  describe('timestamps', () => {
    it('are set by the database/ORM on insert', async () => {
      const before = Date.now();
      const saved = (await manager.save(Project, { name: 'Clock' })) as Project;
      const row = await manager.findOneByOrFail(Project, { id: saved.id });
      expect(row.createdAt).toBeInstanceOf(Date);
      expect(Math.abs(row.createdAt.getTime() - before)).toBeLessThan(10_000);
      expect(row.updatedAt.getTime()).toBeGreaterThanOrEqual(row.createdAt.getTime() - 1000);
    });

    it('updatedAt advances on update while createdAt stays', async () => {
      const saved = (await manager.save(Project, { name: 'Clock' })) as Project;
      const first = await manager.findOneByOrFail(Project, { id: saved.id });
      await new Promise((r) => setTimeout(r, 25));
      await manager.update(Project, { id: saved.id }, { description: 'changed' });
      const second = await manager.findOneByOrFail(Project, { id: saved.id });
      expect(second.createdAt.getTime()).toBe(first.createdAt.getTime());
      expect(second.updatedAt.getTime()).toBeGreaterThan(first.updatedAt.getTime());
    });

    it('task updatedAt advances on update', async () => {
      const { id } = (await manager.save(Project, { name: 'P' })) as Project;
      const saved = (await manager.save(Task, { title: 'T', projectId: id })) as Task;
      const first = await manager.findOneByOrFail(Task, { id: saved.id });
      await new Promise((r) => setTimeout(r, 25));
      await manager.update(Task, { id: saved.id }, { completed: true });
      const second = await manager.findOneByOrFail(Task, { id: saved.id });
      expect(second.updatedAt.getTime()).toBeGreaterThan(first.updatedAt.getTime());
    });
  });

  describe('connection handling', () => {
    it('fails startup with a clear error that does not leak credentials', async () => {
      const saved = { ...process.env };
      process.env.DB_PORT = '1';
      process.env.DB_RETRY_ATTEMPTS = '1';
      process.env.DB_RETRY_DELAY_MS = '0';
      try {
        const error = await createTestApp().then(
          () => undefined,
          (e: Error) => e,
        );
        expect(error).toBeInstanceOf(Error);
        expect(error!.message).not.toContain(saved.DB_PASSWORD!);
      } finally {
        process.env = saved;
      }
    });
  });
});
