import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { createTask, createTestApp, http, missingId } from '../helpers/app.js';

/**
 * [Task 1 prerequisite] gate.
 *
 * These tests only check that the Task 1 foundation works: the app boots, all
 * five routes exist and behave on VALID input. They contain no Task 2
 * validation rules. If a test here fails, finish Task 1 first: the failures in
 * the [Task 2] suites are then not meaningful yet.
 *
 *   pnpm test:e2e:task1-gate
 */
describe('[Task 1 prerequisite] core CRUD works', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createTestApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('boots the application (module wiring + dependency injection)', () => {
    expect(app.getHttpServer()).toBeDefined();
  });

  it('POST /tasks creates a task', async () => {
    const res = await http(app)
      .post('/tasks')
      .send({ title: 'Prerequisite task' })
      .expect(201);
    expect(res.body).toMatchObject({
      title: 'Prerequisite task',
      completed: false,
    });
    expect(typeof res.body.id).toBe('number');
  });

  it('GET /tasks lists tasks', async () => {
    await createTask(app);
    const res = await http(app).get('/tasks').expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('GET /tasks/:id returns a task', async () => {
    const task = await createTask(app);
    const res = await http(app).get(`/tasks/${task.id}`).expect(200);
    expect(res.body.id).toBe(task.id);
  });

  it('PATCH /tasks/:id updates a task', async () => {
    const task = await createTask(app);
    const res = await http(app)
      .patch(`/tasks/${task.id}`)
      .send({ completed: true })
      .expect(200);
    expect(res.body.completed).toBe(true);
  });

  it('DELETE /tasks/:id deletes a task', async () => {
    const task = await createTask(app);
    await http(app).delete(`/tasks/${task.id}`).expect(204);
    await http(app).get(`/tasks/${task.id}`).expect(404);
  });

  it('answers 404 for a task that does not exist', async () => {
    await http(app).get(`/tasks/${await missingId(app)}`).expect(404);
  });
});
