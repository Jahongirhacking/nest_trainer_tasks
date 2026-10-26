import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';

export interface TaskBody {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
}

/**
 * Builds a brand-new application using the REAL `configureApp()` (so the
 * tests exercise your actual global ValidationPipe / filters) with an empty
 * in-memory store. Pass `customize` to override providers for a single test.
 */
export async function createTestApp(
  customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication<App>> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (customize) builder = customize(builder);
  const moduleRef = await builder.compile();
  // `logger: false` keeps expected error logs out of the test output.
  const app = moduleRef.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  configureApp(app);
  await app.init();
  return app;
}

export const http = (app: INestApplication<App>) =>
  request(app.getHttpServer());

export async function createTask(
  app: INestApplication<App>,
  body: Record<string, unknown> = {},
): Promise<TaskBody> {
  const res = await http(app)
    .post('/tasks')
    .send({ title: 'A valid title', ...body })
    .expect(201);
  return res.body as TaskBody;
}

/** An id that is valid but belongs to no task (never hard-codes an id). */
export async function missingId(app: INestApplication<App>): Promise<number> {
  const task = await createTask(app);
  await http(app).delete(`/tasks/${task.id}`).expect(204);
  return task.id;
}
