import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';

describe('Tasks API (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  // A brand-new application (and therefore empty in-memory storage) for
  // every test keeps the tests isolated and order-independent.
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const createTask = async (body: Record<string, unknown> = {}) => {
    const res = await http()
      .post('/tasks')
      .send({ title: 'A valid title', ...body })
      .expect(201);
    return res.body as {
      id: number;
      title: string;
      description?: string;
      completed: boolean;
      createdAt: string;
    };
  };

  const expectBadRequest = (res: request.Response) => {
    expect(res.status).toBe(400);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toBeDefined();
    const messages = [res.body.message].flat();
    expect(messages.length).toBeGreaterThan(0);
    messages.forEach((m) => expect(typeof m).toBe('string'));
  };

  // Only meaningful once GET /tasks really exists (a missing route is a 404,
  // which fails the 200 check here instead of passing silently).
  const expectNoTasksStored = async () => {
    const res = await http().get('/tasks').expect(200);
    expect(res.body).toEqual([]);
  };

  // ---------------------------------------------------------------- POST
  describe('POST /tasks', () => {
    it('creates a task and returns 201 with server-generated fields', async () => {
      const before = Date.now();
      const res = await http()
        .post('/tasks')
        .send({
          title: 'Learn NestJS modules',
          description: 'Understand module boundaries and dependency injection',
        })
        .expect(201);
      const after = Date.now();

      expect(typeof res.body.id).toBe('number');
      expect(Number.isInteger(res.body.id)).toBe(true);
      expect(res.body.id).toBeGreaterThan(0);
      expect(res.body.title).toBe('Learn NestJS modules');
      expect(res.body.description).toBe(
        'Understand module boundaries and dependency injection',
      );
      expect(res.body.completed).toBe(false);

      const createdAt = new Date(res.body.createdAt).getTime();
      expect(Number.isNaN(createdAt)).toBe(false);
      expect(createdAt).toBeGreaterThanOrEqual(before - 1000);
      expect(createdAt).toBeLessThanOrEqual(after + 1000);
    });

    it('creates a task without a description', async () => {
      const task = await createTask({ title: 'No description' });
      expect(task.completed).toBe(false);
    });

    it('assigns different IDs to different tasks', async () => {
      const a = await createTask({ title: 'Task A' });
      const b = await createTask({ title: 'Task B' });
      expect(a.id).not.toBe(b.id);
    });

    it('accepts boundary lengths (title 3 and 100, description 500)', async () => {
      await http().post('/tasks').send({ title: 'abc' }).expect(201);
      await http()
        .post('/tasks')
        .send({ title: 'a'.repeat(100), description: 'd'.repeat(500) })
        .expect(201);
    });

    it('measures the title length after trimming (padded valid title is accepted)', async () => {
      await http().post('/tasks').send({ title: '   abc   ' }).expect(201);
    });

    it('rejects a missing title', async () => {
      expectBadRequest(await http().post('/tasks').send({}));
      expectBadRequest(
        await http().post('/tasks').send({ description: 'only description' }),
      );
      await expectNoTasksStored();
    });

    it('rejects a missing request body', async () => {
      expectBadRequest(await http().post('/tasks'));
    });

    it('rejects a whitespace-only title', async () => {
      expectBadRequest(await http().post('/tasks').send({ title: '     ' }));
      expectBadRequest(await http().post('/tasks').send({ title: '\t\n ' }));
      await expectNoTasksStored();
    });

    it('rejects a title shorter than 3 characters', async () => {
      expectBadRequest(await http().post('/tasks').send({ title: 'ab' }));
      await expectNoTasksStored();
    });

    it('rejects a title that is too short after trimming', async () => {
      expectBadRequest(await http().post('/tasks').send({ title: '  ab  ' }));
    });

    it('rejects a title longer than 100 characters', async () => {
      expectBadRequest(
        await http()
          .post('/tasks')
          .send({ title: 'a'.repeat(101) }),
      );
      await expectNoTasksStored();
    });

    it.each([123, true, null, ['abc'], { a: 'b' }])(
      'rejects a non-string title (%j)',
      async (title) => {
        expectBadRequest(await http().post('/tasks').send({ title }));
        await expectNoTasksStored();
      },
    );

    it('rejects a description longer than 500 characters', async () => {
      expectBadRequest(
        await http()
          .post('/tasks')
          .send({ title: 'Valid title', description: 'd'.repeat(501) }),
      );
      await expectNoTasksStored();
    });

    it.each([123, true, ['x'], { a: 'b' }])(
      'rejects a non-string description (%j)',
      async (description) => {
        expectBadRequest(
          await http()
            .post('/tasks')
            .send({ title: 'Valid title', description }),
        );
        await expectNoTasksStored();
      },
    );

    it('rejects a client-provided completed value', async () => {
      expectBadRequest(
        await http()
          .post('/tasks')
          .send({ title: 'Valid title', completed: true }),
      );
      await expectNoTasksStored();
    });

    it('rejects a client-provided id', async () => {
      expectBadRequest(
        await http().post('/tasks').send({ title: 'Valid title', id: 42 }),
      );
      await expectNoTasksStored();
    });

    it('rejects a client-provided createdAt', async () => {
      expectBadRequest(
        await http().post('/tasks').send({
          title: 'Valid title',
          createdAt: '2000-01-01T00:00:00.000Z',
        }),
      );
      await expectNoTasksStored();
    });

    it('rejects unknown properties', async () => {
      expectBadRequest(
        await http()
          .post('/tasks')
          .send({ title: 'Valid title', priority: 'high' }),
      );
      await expectNoTasksStored();
    });
  });

  // ----------------------------------------------------------- GET (all)
  describe('GET /tasks', () => {
    it('returns an empty array when no tasks exist', async () => {
      const res = await http().get('/tasks').expect(200);
      expect(res.body).toEqual([]);
    });

    it('returns all created tasks', async () => {
      const a = await createTask({ title: 'Task A' });
      const b = await createTask({ title: 'Task B' });

      const res = await http().get('/tasks').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body).toEqual(expect.arrayContaining([a, b]));
    });
  });

  // ------------------------------------------------------------ GET (one)
  describe('GET /tasks/:id', () => {
    it('returns the requested task', async () => {
      await createTask({ title: 'Task A' });
      const b = await createTask({ title: 'Task B' });

      const res = await http().get(`/tasks/${b.id}`).expect(200);

      expect(res.body).toEqual(b);
    });

    it('returns 404 for a nonexistent task', async () => {
      const existing = await createTask();
      const res = await http()
        .get(`/tasks/${existing.id + 1000}`)
        .expect(404);
      expect(res.body.statusCode).toBe(404);
    });

    it.each(['abc', '0', '-1', '1.5', '1abc', '%20'])(
      'returns 400 for the malformed id "%s"',
      async (id) => {
        expectBadRequest(await http().get(`/tasks/${id}`));
      },
    );
  });

  // ---------------------------------------------------------------- PATCH
  describe('PATCH /tasks/:id', () => {
    it('updates a single property and leaves the others unchanged', async () => {
      const task = await createTask({
        title: 'Original',
        description: 'Keep me',
      });

      const res = await http()
        .patch(`/tasks/${task.id}`)
        .send({ completed: true })
        .expect(200);

      expect(res.body).toEqual({ ...task, completed: true });
      const fetched = await http().get(`/tasks/${task.id}`).expect(200);
      expect(fetched.body).toEqual({ ...task, completed: true });
    });

    it('updates several properties at once', async () => {
      const task = await createTask({ title: 'Original' });

      const res = await http()
        .patch(`/tasks/${task.id}`)
        .send({
          title: 'Renamed',
          description: 'Now described',
          completed: true,
        })
        .expect(200);

      expect(res.body.title).toBe('Renamed');
      expect(res.body.description).toBe('Now described');
      expect(res.body.completed).toBe(true);
      expect(res.body.id).toBe(task.id);
      expect(res.body.createdAt).toBe(task.createdAt);
    });

    it('does not modify other tasks', async () => {
      const a = await createTask({ title: 'Task A' });
      const b = await createTask({ title: 'Task B' });
      await http()
        .patch(`/tasks/${a.id}`)
        .send({ title: 'Changed' })
        .expect(200);
      const res = await http().get(`/tasks/${b.id}`).expect(200);
      expect(res.body).toEqual(b);
    });

    it('returns 404 for a nonexistent task', async () => {
      const existing = await createTask();
      const res = await http()
        .patch(`/tasks/${existing.id + 1000}`)
        .send({ title: 'Valid title' })
        .expect(404);
      expect(res.body.statusCode).toBe(404);
    });

    it.each(['abc', '0', '-1', '1.5'])(
      'returns 400 for the malformed id "%s"',
      async (id) => {
        expectBadRequest(
          await http().patch(`/tasks/${id}`).send({ title: 'Valid title' }),
        );
      },
    );

    it('rejects an empty body', async () => {
      const task = await createTask();
      expectBadRequest(await http().patch(`/tasks/${task.id}`).send({}));
    });

    it('rejects a missing body', async () => {
      const task = await createTask();
      expectBadRequest(await http().patch(`/tasks/${task.id}`));
    });

    it('rejects unknown properties', async () => {
      const task = await createTask();
      expectBadRequest(
        await http()
          .patch(`/tasks/${task.id}`)
          .send({ title: 'Valid title', priority: 'high' }),
      );
      expectBadRequest(
        await http().patch(`/tasks/${task.id}`).send({ priority: 'high' }),
      );
    });

    it('rejects attempts to modify id', async () => {
      const task = await createTask();
      expectBadRequest(
        await http()
          .patch(`/tasks/${task.id}`)
          .send({ id: task.id + 100 }),
      );
      const res = await http().get(`/tasks/${task.id}`).expect(200);
      expect(res.body).toEqual(task);
    });

    it('rejects attempts to modify createdAt', async () => {
      const task = await createTask();
      expectBadRequest(
        await http()
          .patch(`/tasks/${task.id}`)
          .send({ createdAt: '2000-01-01T00:00:00.000Z' }),
      );
      const res = await http().get(`/tasks/${task.id}`).expect(200);
      expect(res.body).toEqual(task);
    });

    it.each([123, true, null, ['abc']])(
      'rejects a non-string title (%j)',
      async (title) => {
        const task = await createTask();
        expectBadRequest(
          await http().patch(`/tasks/${task.id}`).send({ title }),
        );
      },
    );

    it('rejects a whitespace-only title', async () => {
      const task = await createTask();
      expectBadRequest(
        await http().patch(`/tasks/${task.id}`).send({ title: '    ' }),
      );
    });

    it('rejects a title shorter than 3 or longer than 100 characters', async () => {
      const task = await createTask();
      expectBadRequest(
        await http().patch(`/tasks/${task.id}`).send({ title: 'ab' }),
      );
      expectBadRequest(
        await http()
          .patch(`/tasks/${task.id}`)
          .send({ title: 'a'.repeat(101) }),
      );
      const res = await http().get(`/tasks/${task.id}`).expect(200);
      expect(res.body).toEqual(task);
    });

    it('rejects a description longer than 500 characters', async () => {
      const task = await createTask();
      expectBadRequest(
        await http()
          .patch(`/tasks/${task.id}`)
          .send({ description: 'd'.repeat(501) }),
      );
    });

    it.each([123, true, ['x']])(
      'rejects a non-string description (%j)',
      async (description) => {
        const task = await createTask();
        expectBadRequest(
          await http().patch(`/tasks/${task.id}`).send({ description }),
        );
      },
    );

    it.each(['true', 1, 0, null, 'yes'])(
      'rejects a non-boolean completed (%j)',
      async (completed) => {
        const task = await createTask();
        expectBadRequest(
          await http().patch(`/tasks/${task.id}`).send({ completed }),
        );
        const res = await http().get(`/tasks/${task.id}`).expect(200);
        expect(res.body.completed).toBe(false);
      },
    );
  });

  // --------------------------------------------------------------- DELETE
  describe('DELETE /tasks/:id', () => {
    it('deletes the task and returns 204 with no body', async () => {
      const task = await createTask();

      const res = await http().delete(`/tasks/${task.id}`).expect(204);
      expect(res.text).toBeFalsy();

      await http().get(`/tasks/${task.id}`).expect(404);
      await expectNoTasksStored();
    });

    it('only deletes the requested task', async () => {
      const a = await createTask({ title: 'Task A' });
      const b = await createTask({ title: 'Task B' });
      await http().delete(`/tasks/${a.id}`).expect(204);
      const res = await http().get('/tasks').expect(200);
      expect(res.body).toEqual([b]);
    });

    it('returns 404 for a nonexistent task', async () => {
      const existing = await createTask();
      const res = await http()
        .delete(`/tasks/${existing.id + 1000}`)
        .expect(404);
      expect(res.body.statusCode).toBe(404);
    });

    it('returns 404 when deleting the same task twice', async () => {
      const task = await createTask();
      await http().delete(`/tasks/${task.id}`).expect(204);
      await http().delete(`/tasks/${task.id}`).expect(404);
    });

    it.each(['abc', '0', '-1', '1.5'])(
      'returns 400 for the malformed id "%s"',
      async (id) => {
        expectBadRequest(await http().delete(`/tasks/${id}`));
      },
    );
  });

  // ---------------------------------------------------------- isolation
  describe('isolation', () => {
    it('starts every test with an empty store (part 1)', async () => {
      await createTask();
      const res = await http().get('/tasks').expect(200);
      expect(res.body).toHaveLength(1);
    });

    it('starts every test with an empty store (part 2)', async () => {
      const res = await http().get('/tasks').expect(200);
      expect(res.body).toHaveLength(0);
    });
  });
});
