import {
  ConflictException,
  HttpException,
  NotFoundException,
  type INestApplication,
} from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { TasksService } from '../../src/tasks/tasks.service.js';
import {
  createTask,
  createTestApp,
  http,
  missingId,
  type TaskBody,
} from '../helpers/app.js';
import { expectApiError, expectNoInternalDetails } from '../helpers/api-error.js';

describe('[Task 2] consistent error responses', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createTestApp();
  });
  afterEach(async () => {
    await app.close();
  });

  describe('every expected client error uses the same envelope', () => {
    const scenarios: Array<[string, number, () => Promise<import('supertest').Response>]> = [
      ['invalid POST body', 400, () => http(app).post('/tasks').send({ title: 1 })],
      ['unknown property on POST', 400, () => http(app).post('/tasks').send({ title: 'Valid', x: 1 })],
      ['malformed id', 400, () => http(app).get('/tasks/abc')],
      ['nonexistent id (GET)', 404, async () => http(app).get(`/tasks/${await missingId(app)}`)],
      ['nonexistent id (DELETE)', 404, async () => http(app).delete(`/tasks/${await missingId(app)}`)],
    ];

    it.each(scenarios)('%s', async (_label, status, run) => {
      expectApiError(await run(), status);
    });

    it('invalid JSON syntax is a 400 and not a 500', async () => {
      const res = await http(app)
        .post('/tasks')
        .set('Content-Type', 'application/json')
        .send('{"title": ');
      expect(res.status).toBe(400);
      expectNoInternalDetails(res);
    });

    it('validation failures are never HTTP 500', async () => {
      const bodies = [{}, { title: null }, { title: 'ab' }, { x: 1 }, []];
      for (const body of bodies) {
        const res = await http(app).post('/tasks').send(body as object);
        expect(res.status).toBe(400);
      }
    });

    it('never answers an error with a 2xx status or an embedded error object', async () => {
      const res = await http(app).post('/tasks').send({ title: 5 });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).not.toHaveProperty('success');
      expect(res.body).not.toHaveProperty('data');
    });
  });

  describe('successful responses keep their documented format', () => {
    it('POST returns the bare task object (no envelope)', async () => {
      const res = await http(app)
        .post('/tasks')
        .send({ title: 'Valid title', description: 'd' })
        .expect(201);
      expect(Object.keys(res.body).sort()).toEqual(
        ['completed', 'createdAt', 'description', 'id', 'title'].sort(),
      );
    });

    it('GET /tasks returns a plain array', async () => {
      await createTask(app);
      const res = await http(app).get('/tasks').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as TaskBody[])[0]).not.toHaveProperty('errors');
    });

    it('GET /tasks/:id and PATCH return the bare task object', async () => {
      const task = await createTask(app);
      const got = await http(app).get(`/tasks/${task.id}`).expect(200);
      expect(got.body).toEqual(task);
      const patched = await http(app)
        .patch(`/tasks/${task.id}`)
        .send({ title: 'Renamed' })
        .expect(200);
      expect(patched.body).toEqual({ ...task, title: 'Renamed' });
    });

    it('DELETE returns 204 with an empty body', async () => {
      const task = await createTask(app);
      const res = await http(app).delete(`/tasks/${task.id}`).expect(204);
      expect(res.text).toBe('');
    });
  });
});

describe('[Task 2] exceptions thrown below the controller', () => {
  const withService = async (overrides: Partial<Record<keyof TasksService, () => never>>) =>
    createTestApp((b) => b.overrideProvider(TasksService).useValue(overrides));

  it('an unexpected Error becomes a 500, never a success, and leaks nothing', async () => {
    const app = await withService({
      findAll: () => {
        throw new Error('database exploded: secret-internal-detail');
      },
    });
    try {
      const res = await http(app).get('/tasks');
      expect(res.status).toBe(500);
      expect(res.body.statusCode).toBe(500);
      expectNoInternalDetails(res);
      expect(JSON.stringify(res.body)).not.toContain('secret-internal-detail');
    } finally {
      await app.close();
    }
  });

  it('an HttpException keeps its own status code (404 stays 404)', async () => {
    const app = await withService({
      findOne: () => {
        throw new NotFoundException('nope');
      },
    });
    try {
      expectApiError(await http(app).get('/tasks/1'), 404);
    } finally {
      await app.close();
    }
  });

  it('other HttpException statuses are preserved (409)', async () => {
    const app = await withService({
      findOne: () => {
        throw new ConflictException('already exists');
      },
    });
    try {
      expectApiError(await http(app).get('/tasks/1'), 409);
    } finally {
      await app.close();
    }
  });

  it('a non-standard HttpException status is preserved (418)', async () => {
    const app = await withService({
      findOne: () => {
        throw new HttpException('teapot', 418);
      },
    });
    try {
      const res = await http(app).get('/tasks/1');
      expect(res.status).toBe(418);
      expect(res.body.statusCode).toBe(418);
    } finally {
      await app.close();
    }
  });
});
