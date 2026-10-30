import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { errorFields, expectApiError } from './helpers/api-error.js';
import {
  createProject,
  createTask,
  createTestApp,
  http,
  missingProjectId,
  resetDatabase,
  taskRows,
  type TaskBody,
} from './helpers/app.js';

describe('Tasks API (e2e, PostgreSQL)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(app);
  });

  const expectTaskShape = (body: TaskBody) => {
    expect(typeof body.id).toBe('number');
    expect(typeof body.title).toBe('string');
    expect(typeof body.completed).toBe('boolean');
    expect(typeof body.projectId).toBe('number');
    expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(body.updatedAt))).toBe(false);
    // The project is identified by projectId only: no nested/circular data.
    expect(body).not.toHaveProperty('project');
    expect(() => JSON.stringify(body)).not.toThrow();
  };

  describe('POST /projects/:projectId/tasks', () => {
    it('creates a task (201) with server-generated fields', async () => {
      const project = await createProject(app);
      const before = Date.now();
      const res = await http(app)
        .post(`/projects/${project.id}/tasks`)
        .send({ title: 'Implement authentication', description: 'Learn Passport and JWT' })
        .expect(201);
      expectTaskShape(res.body);
      expect(res.body).toMatchObject({
        title: 'Implement authentication',
        description: 'Learn Passport and JWT',
        completed: false,
        projectId: project.id,
      });
      expect(Date.parse(res.body.createdAt)).toBeGreaterThan(before - 5000);
    });

    it('description is optional', async () => {
      const project = await createProject(app);
      const res = await http(app)
        .post(`/projects/${project.id}/tasks`)
        .send({ title: 'No description' })
        .expect(201);
      expect(res.body.description ?? null).toBeNull();
    });

    it('returns 404 when the project does not exist and stores nothing', async () => {
      const id = await missingProjectId(app);
      expectApiError(await http(app).post(`/projects/${id}/tasks`).send({ title: 'Orphan' }), 404);
      expect(await taskRows(app)).toEqual([]);
    });

    it.each(['abc', '0', '-3', '2.5'])('returns 400 for projectId "%s"', async (id) => {
      expectApiError(await http(app).post(`/projects/${id}/tasks`).send({ title: 'Valid title' }), 400);
    });

    it.each([
      ['missing title', {}],
      ['empty title', { title: '' }],
      ['whitespace-only title', { title: '     ' }],
      ['too-long title', { title: 'a'.repeat(101) }],
      ['too-long description', { title: 'Valid', description: 'a'.repeat(501) }],
      ['client-provided id', { title: 'Valid title', id: 5 }],
      ['client-provided projectId', { title: 'Valid title', projectId: 1 }],
      ['client-provided completed flag', { title: 'Valid title', completed: true }],
      ['client-provided createdAt', { title: 'Valid title', createdAt: '2000-01-01' }],
      ['unknown property', { title: 'Valid title', x: 1 }],
    ])('returns 400 for %s', async (_label, body) => {
      const project = await createProject(app);
      const res = await http(app).post(`/projects/${project.id}/tasks`).send(body);
      expectApiError(res, 400, { fields: true });
      expect(await taskRows(app)).toEqual([]);
    });

    it('rejects a body-supplied projectId even if the route project exists', async () => {
      const a = await createProject(app);
      const b = await createProject(app);
      const res = await http(app)
        .post(`/projects/${a.id}/tasks`)
        .send({ title: 'Valid title', projectId: b.id });
      expect(errorFields(expectApiError(res, 400, { fields: true }))).toContain('projectId');
    });
  });

  describe('GET /projects/:projectId/tasks', () => {
    it('returns only the tasks of that project', async () => {
      const a = await createProject(app);
      const b = await createProject(app);
      const inA = await createTask(app, a.id);
      await createTask(app, b.id);
      const res = await http(app).get(`/projects/${a.id}/tasks`).expect(200);
      expect((res.body as TaskBody[]).map((t) => t.id)).toEqual([inA.id]);
      (res.body as TaskBody[]).forEach(expectTaskShape);
    });

    it('returns [] for an existing project with no tasks', async () => {
      const project = await createProject(app);
      expect((await http(app).get(`/projects/${project.id}/tasks`).expect(200)).body).toEqual([]);
    });

    it('returns 404 for a missing project', async () => {
      const id = await missingProjectId(app);
      expectApiError(await http(app).get(`/projects/${id}/tasks`), 404);
    });

    it('returns 400 for a malformed project id', async () => {
      expectApiError(await http(app).get('/projects/abc/tasks'), 400);
    });
  });
});
