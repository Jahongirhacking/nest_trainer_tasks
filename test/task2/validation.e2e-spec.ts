import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { createTask, createTestApp, http, missingId } from '../helpers/app.js';
import { errorFields, expectApiError } from '../helpers/api-error.js';

const repeat = (n: number) => 'a'.repeat(n);

describe('[Task 2] body validation through the real global ValidationPipe', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createTestApp();
  });
  afterEach(async () => {
    await app.close();
  });

  const expectNothingStored = async () => {
    const res = await http(app).get('/tasks').expect(200);
    expect(res.body).toEqual([]);
  };

  // ---------------------------------------------------------------- POST
  describe('POST /tasks', () => {
    it('returns 201 for boundary-length values and server-controlled fields', async () => {
      const res = await http(app)
        .post('/tasks')
        .send({ title: ` ${repeat(100)} `, description: repeat(500) })
        .expect(201);
      expect(res.body.completed).toBe(false);
      expect(typeof res.body.id).toBe('number');
      expect(Number.isNaN(Date.parse(res.body.createdAt))).toBe(false);
    });

    it.each([
      ['missing', {}],
      ['null', { title: null }],
      ['a number', { title: 123 }],
      ['a boolean', { title: true }],
      ['an array', { title: ['abc'] }],
      ['an object', { title: { a: 1 } }],
      ['empty', { title: '' }],
      ['whitespace only', { title: '   \t  ' }],
      ['too short', { title: 'ab' }],
      ['too short after trimming', { title: '  ab  ' }],
      ['too long', { title: repeat(101) }],
    ])('400 with a field error for a title that is %s', async (_l, body) => {
      const res = await http(app).post('/tasks').send(body);
      expect(errorFields(expectApiError(res, 400, { fields: true }))).toContain(
        'title',
      );
      await expectNothingStored();
    });

    it.each([
      ['null', null],
      ['a number', 7],
      ['a boolean', true],
      ['too long', repeat(501)],
    ])('400 with a field error for a description that is %s', async (_l, d) => {
      const res = await http(app)
        .post('/tasks')
        .send({ title: 'Valid title', description: d });
      expect(errorFields(expectApiError(res, 400, { fields: true }))).toContain(
        'description',
      );
      await expectNothingStored();
    });

    it.each([
      ['id', { id: 99 }],
      ['createdAt', { createdAt: '2000-01-01T00:00:00.000Z' }],
      ['completed: true', { completed: true }],
      ['completed: false', { completed: false }],
      ['an unknown property', { priority: 'high' }],
    ])('400 naming the offending field when the client sends %s', async (_l, extra) => {
      const res = await http(app)
        .post('/tasks')
        .send({ title: 'Valid title', ...extra });
      expect(errorFields(expectApiError(res, 400, { fields: true }))).toContain(
        Object.keys(extra)[0],
      );
      await expectNothingStored();
    });

    it('reports all invalid fields in one response', async () => {
      const res = await http(app)
        .post('/tasks')
        .send({ title: 'x', description: 5, extra: true });
      const fields = errorFields(expectApiError(res, 400, { fields: true }));
      expect(fields).toEqual(
        expect.arrayContaining(['title', 'description', 'extra']),
      );
    });

    it('400 for a missing request body', async () => {
      const res = await http(app).post('/tasks');
      expectApiError(res, 400);
      await expectNothingStored();
    });
  });

  // --------------------------------------------------------------- PATCH
  describe('PATCH /tasks/:id', () => {
    it.each([
      ['title only', { title: 'Changed title' }],
      ['description only', { description: 'Changed' }],
      ['completed only', { completed: true }],
      ['all three', { title: 'Changed', description: 'd', completed: true }],
    ])('200 for an update with %s', async (_l, body) => {
      const task = await createTask(app, { description: 'original' });
      const res = await http(app)
        .patch(`/tasks/${task.id}`)
        .send(body)
        .expect(200);
      expect(res.body).toMatchObject(body);
      expect(res.body.id).toBe(task.id);
      expect(res.body.createdAt).toBe(task.createdAt);
    });

    it('keeps properties that were not sent unchanged', async () => {
      const task = await createTask(app, { description: 'original' });
      const res = await http(app)
        .patch(`/tasks/${task.id}`)
        .send({ completed: true })
        .expect(200);
      expect(res.body.title).toBe(task.title);
      expect(res.body.description).toBe('original');
    });

    it('accepts completed: false (a falsy value is still a value)', async () => {
      const task = await createTask(app);
      await http(app).patch(`/tasks/${task.id}`).send({ completed: true });
      const res = await http(app)
        .patch(`/tasks/${task.id}`)
        .send({ completed: false })
        .expect(200);
      expect(res.body.completed).toBe(false);
    });

    it.each([
      ['an empty object', {}],
      ['only unknown properties', { priority: 'high' }],
    ])('400 for %s and leaves the task untouched', async (_l, body) => {
      const task = await createTask(app);
      const res = await http(app).patch(`/tasks/${task.id}`).send(body);
      expectApiError(res, 400);
      const after = await http(app).get(`/tasks/${task.id}`).expect(200);
      expect(after.body).toEqual(task);
    });

    it('400 for a missing request body', async () => {
      const task = await createTask(app);
      expectApiError(await http(app).patch(`/tasks/${task.id}`), 400);
    });

    it.each([
      ['title: null', { title: null }, 'title'],
      ['description: null', { description: null }, 'description'],
      ['completed: null', { completed: null }, 'completed'],
      ['title: number', { title: 5 }, 'title'],
      ['title: whitespace', { title: '    ' }, 'title'],
      ['title: too short', { title: 'ab' }, 'title'],
      ['title: too long', { title: repeat(101) }, 'title'],
      ['description: number', { description: 5 }, 'description'],
      ['description: too long', { description: repeat(501) }, 'description'],
      ['completed: "true"', { completed: 'true' }, 'completed'],
      ['completed: 1', { completed: 1 }, 'completed'],
      ['completed: 0', { completed: 0 }, 'completed'],
    ])('400 with a field error for %s', async (_l, body, field) => {
      const task = await createTask(app);
      const res = await http(app).patch(`/tasks/${task.id}`).send(body);
      expect(errorFields(expectApiError(res, 400, { fields: true }))).toContain(
        field,
      );
      const after = await http(app).get(`/tasks/${task.id}`).expect(200);
      expect(after.body).toEqual(task);
    });

    it.each([
      ['id', { id: 12345 }],
      ['createdAt', { createdAt: '2000-01-01T00:00:00.000Z' }],
      ['an unknown property', { priority: 'high' }],
    ])('400 naming %s, even next to a valid property, without changing anything', async (_l, extra) => {
      const task = await createTask(app);
      const res = await http(app)
        .patch(`/tasks/${task.id}`)
        .send({ completed: true, ...extra });
      expect(errorFields(expectApiError(res, 400, { fields: true }))).toContain(
        Object.keys(extra)[0],
      );
      const after = await http(app).get(`/tasks/${task.id}`).expect(200);
      expect(after.body).toEqual(task);
    });

    it('validates the body before looking the task up (invalid body + missing id => 400)', async () => {
      const id = await missingId(app);
      const res = await http(app).patch(`/tasks/${id}`).send({ title: 'x' });
      expectApiError(res, 400, { fields: true });
    });

    it('404 (not 400) for a valid body and a nonexistent id', async () => {
      const id = await missingId(app);
      const res = await http(app).patch(`/tasks/${id}`).send({ completed: true });
      expectApiError(res, 404);
    });
  });
});
