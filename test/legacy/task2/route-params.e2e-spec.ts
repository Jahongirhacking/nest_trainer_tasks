import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { createTask, createTestApp, http, missingId } from '../app-helper.js';
import { expectApiError } from '../../helpers/api-error.js';

const MALFORMED_IDS = ['abc', '0', '-1', '1.5', '1abc'];

describe('[Task 2] route parameter validation (:id)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createTestApp();
  });
  afterEach(async () => {
    await app.close();
  });

  describe.each(MALFORMED_IDS)('malformed id "%s"', (id) => {
    it('GET /tasks/:id => 400', async () => {
      expectApiError(await http(app).get(`/tasks/${id}`), 400);
    });

    it('PATCH /tasks/:id => 400 (even with a valid body)', async () => {
      const res = await http(app).patch(`/tasks/${id}`).send({ completed: true });
      expectApiError(res, 400);
    });

    it('DELETE /tasks/:id => 400 and nothing is deleted', async () => {
      const task = await createTask(app);
      expectApiError(await http(app).delete(`/tasks/${id}`), 400);
      await http(app).get(`/tasks/${task.id}`).expect(200);
    });
  });

  describe('valid but nonexistent id', () => {
    it('GET => 404', async () => {
      const id = await missingId(app);
      expectApiError(await http(app).get(`/tasks/${id}`), 404);
    });

    it('PATCH => 404', async () => {
      const id = await missingId(app);
      const res = await http(app).patch(`/tasks/${id}`).send({ completed: true });
      expectApiError(res, 404);
    });

    it('DELETE => 404', async () => {
      const id = await missingId(app);
      expectApiError(await http(app).delete(`/tasks/${id}`), 404);
    });

    it('does not conflate the two cases: malformed is 400, missing is 404', async () => {
      const id = await missingId(app);
      expect((await http(app).get('/tasks/abc')).status).toBe(400);
      expect((await http(app).get(`/tasks/${id}`)).status).toBe(404);
    });
  });

  it('still accepts a valid existing id', async () => {
    const task = await createTask(app);
    await http(app).get(`/tasks/${task.id}`).expect(200);
    await http(app).patch(`/tasks/${task.id}`).send({ completed: true }).expect(200);
    await http(app).delete(`/tasks/${task.id}`).expect(204);
  });
});
