import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';

export interface ProjectBody {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskBody {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  projectId: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Builds a brand-new application with the REAL `configureApp()` and the REAL
 * AppModule, connected to the PostgreSQL TEST database (see
 * test/setup-env.ts). Nothing is mocked.
 */
export async function createTestApp(
  customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication<App>> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (customize) builder = customize(builder);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  configureApp(app);
  await app.init();
  return app;
}

export const http = (app: INestApplication<App>) =>
  request(app.getHttpServer());

/**
 * Empties every table (except TypeORM's `migrations` bookkeeping table) in the
 * TEST database so each test starts from a clean state. Table names are read
 * from the database, so this does not depend on how you named yours.
 */
export async function resetDatabase(
  app: INestApplication<App>,
): Promise<void> {
  const dataSource = app.get(DataSource);
  if (!dataSource.options.database?.toString().endsWith('_test')) {
    throw new Error('resetDatabase() refused: not a *_test database.');
  }
  const rows: { tablename: string }[] = await dataSource.query(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = current_schema() AND tablename <> 'migrations'`,
  );
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

let counter = 0;
const unique = (prefix: string) => `${prefix} ${Date.now()}-${++counter}`;

export async function createProject(
  app: INestApplication<App>,
  body: Record<string, unknown> = {},
): Promise<ProjectBody> {
  const res = await http(app)
    .post('/projects')
    .send({ name: unique('Project'), ...body });
  if (res.status !== 201) {
    throw new Error(
      `Test SETUP failed: POST /projects with a valid body returned ` +
        `${res.status} ${JSON.stringify(res.body)}. Fix POST /projects first.`,
    );
  }
  return res.body as ProjectBody;
}

export async function createTask(
  app: INestApplication<App>,
  projectId: number,
  body: Record<string, unknown> = {},
): Promise<TaskBody> {
  const res = await http(app)
    .post(`/projects/${projectId}/tasks`)
    .send({ title: unique('Task'), ...body });
  if (res.status !== 201) {
    throw new Error(
      `Test SETUP failed: POST /projects/${projectId}/tasks with a valid ` +
        `body returned ${res.status} ${JSON.stringify(res.body)}.`,
    );
  }
  return res.body as TaskBody;
}

/** A valid-looking project id that belongs to no project. */
export async function missingProjectId(
  app: INestApplication<App>,
): Promise<number> {
  const project = await createProject(app);
  await http(app).delete(`/projects/${project.id}`).expect(204);
  return project.id;
}

/** A valid-looking task id that belongs to no task. */
export async function missingTaskId(
  app: INestApplication<App>,
): Promise<number> {
  const project = await createProject(app);
  const task = await createTask(app, project.id);
  await http(app).delete(`/tasks/${task.id}`).expect(204);
  return task.id;
}
