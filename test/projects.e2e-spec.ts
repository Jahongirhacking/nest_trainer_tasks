import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { expectApiError } from './helpers/api-error.js';
import {
  createProject,
  createTask,
  createTestApp,
  http,
  missingProjectId,
  resetDatabase,
  type ProjectBody,
} from './helpers/app.js';

describe('Projects API (e2e, PostgreSQL)', () => {
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

  const expectProjectShape = (body: ProjectBody) => {
    expect(typeof body.id).toBe('number');
    expect(typeof body.name).toBe('string');
    expect(typeof body.createdAt).toBe('string');
    expect(typeof body.updatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);
    // Never leak relations / internals / circular structures.
    expect(body).not.toHaveProperty('tasks');
    expect(() => JSON.stringify(body)).not.toThrow();
  };

  describe('POST /projects', () => {
    it('creates a project (201) with server-generated fields', async () => {
      const res = await http(app)
        .post('/projects')
        .send({ name: 'FotSpot Backend', description: 'Backend development tasks' })
        .expect(201);
      expectProjectShape(res.body);
      expect(res.body).toMatchObject({
        name: 'FotSpot Backend',
        description: 'Backend development tasks',
      });
    });

    it('description is optional', async () => {
      const res = await http(app).post('/projects').send({ name: 'P' }).expect(201);
      expect(res.body.description ?? null).toBeNull();
    });

    it('trims the name', async () => {
      const res = await http(app).post('/projects').send({ name: '  Padded  ' }).expect(201);
      expect(res.body.name).toBe('Padded');
    });

    it.each([
      ['missing name', {}],
      ['empty name', { name: '' }],
      ['whitespace-only name', { name: '    ' }],
      ['non-string name', { name: 5 }],
      ['name over 100 characters', { name: 'a'.repeat(101) }],
      ['description over 500 characters', { name: 'P', description: 'a'.repeat(501) }],
      ['client-provided id', { name: 'P', id: 1 }],
      ['client-provided createdAt', { name: 'P', createdAt: '2000-01-01' }],
      ['unknown property', { name: 'P', color: 'red' }],
    ])('rejects %s with 400', async (_label, body) => {
      const res = await http(app).post('/projects').send(body);
      expectApiError(res, 400, { fields: true });
      expect((await http(app).get('/projects').expect(200)).body).toEqual([]);
    });

    it('accepts a name of exactly 100 characters', async () => {
      await http(app).post('/projects').send({ name: 'a'.repeat(100) }).expect(201);
    });

    it('returns 409 for a duplicate name and stores only one', async () => {
      await createProject(app, { name: 'Same' });
      const res = await http(app).post('/projects').send({ name: 'Same' });
      expectApiError(res, 409);
      expect((await http(app).get('/projects').expect(200)).body).toHaveLength(1);
    });
  });

  describe('GET /projects', () => {
    it('returns an empty array when there are no projects', async () => {
      const res = await http(app).get('/projects').expect(200);
      expect(res.body).toEqual([]);
    });

    it('returns every project', async () => {
      const a = await createProject(app);
      const b = await createProject(app);
      const res = await http(app).get('/projects').expect(200);
      expect((res.body as ProjectBody[]).map((p) => p.id).sort((x, y) => x - y)).toEqual(
        [a.id, b.id].sort((x, y) => x - y),
      );
      (res.body as ProjectBody[]).forEach(expectProjectShape);
    });
  });

  describe('GET /projects/:id', () => {
    it('returns the project', async () => {
      const project = await createProject(app, { description: 'd' });
      const res = await http(app).get(`/projects/${project.id}`).expect(200);
      expectProjectShape(res.body);
      expect(res.body).toMatchObject({ id: project.id, name: project.name, description: 'd' });
    });

    it.each(['abc', '0', '-1', '1.5', '1e3', ' '])(
      'returns 400 for the malformed id "%s"',
      async (id) => {
        expectApiError(await http(app).get(`/projects/${encodeURIComponent(id)}`), 400);
      },
    );

    it('returns 404 for a missing project', async () => {
      const id = await missingProjectId(app);
      expectApiError(await http(app).get(`/projects/${id}`), 404);
    });
  });

  describe('PATCH /projects/:id', () => {
    it('updates name and description', async () => {
      const project = await createProject(app);
      const res = await http(app)
        .patch(`/projects/${project.id}`)
        .send({ name: 'Renamed', description: 'Changed' })
        .expect(200);
      expect(res.body).toMatchObject({ id: project.id, name: 'Renamed', description: 'Changed' });
      const reread = await http(app).get(`/projects/${project.id}`).expect(200);
      expect(reread.body.name).toBe('Renamed');
    });

    it('updates a single field and leaves the other untouched', async () => {
      const project = await createProject(app, { description: 'keep me' });
      const res = await http(app)
        .patch(`/projects/${project.id}`)
        .send({ name: 'Only name' })
        .expect(200);
      expect(res.body).toMatchObject({ name: 'Only name', description: 'keep me' });
    });

    it('allows sending the project\'s own current name', async () => {
      const project = await createProject(app);
      await http(app).patch(`/projects/${project.id}`).send({ name: project.name }).expect(200);
    });

    it.each([
      ['an empty body', {}],
      ['an empty name', { name: '' }],
      ['a whitespace-only name', { name: '  ' }],
      ['a too-long name', { name: 'a'.repeat(101) }],
      ['a too-long description', { description: 'a'.repeat(501) }],
      ['an unknown property', { color: 'red' }],
      ['client-provided id', { id: 99 }],
      ['client-provided createdAt', { createdAt: '2000-01-01' }],
      ['client-provided updatedAt', { updatedAt: '2000-01-01' }],
    ])('rejects %s with 400', async (_label, body) => {
      const project = await createProject(app);
      expectApiError(await http(app).patch(`/projects/${project.id}`).send(body), 400);
      const reread = await http(app).get(`/projects/${project.id}`).expect(200);
      expect(reread.body.name).toBe(project.name);
    });

    it('returns 400 for a malformed id', async () => {
      expectApiError(await http(app).patch('/projects/abc').send({ name: 'x' }), 400);
    });

    it('returns 404 for a missing project', async () => {
      const id = await missingProjectId(app);
      expectApiError(await http(app).patch(`/projects/${id}`).send({ name: 'x' }), 404);
    });

    it('returns 409 when the name belongs to another project', async () => {
      const a = await createProject(app);
      const b = await createProject(app);
      expectApiError(await http(app).patch(`/projects/${b.id}`).send({ name: a.name }), 409);
      const reread = await http(app).get(`/projects/${b.id}`).expect(200);
      expect(reread.body.name).toBe(b.name);
    });

    it('moves updatedAt forward and keeps createdAt', async () => {
      const project = await createProject(app);
      await new Promise((r) => setTimeout(r, 20));
      const res = await http(app).patch(`/projects/${project.id}`).send({ description: 'x' }).expect(200);
      expect(res.body.createdAt).toBe(project.createdAt);
      expect(Date.parse(res.body.updatedAt)).toBeGreaterThan(Date.parse(project.updatedAt));
    });
  });

  describe('DELETE /projects/:id', () => {
    it('deletes an empty project (204, empty body)', async () => {
      const project = await createProject(app);
      const res = await http(app).delete(`/projects/${project.id}`).expect(204);
      expect(res.text).toBe('');
      expectApiError(await http(app).get(`/projects/${project.id}`), 404);
    });

    it('returns 400 for a malformed id', async () => {
      expectApiError(await http(app).delete('/projects/abc'), 400);
    });

    it('returns 404 for a missing project', async () => {
      const id = await missingProjectId(app);
      expectApiError(await http(app).delete(`/projects/${id}`), 404);
    });

    it('returns 409 when the project has tasks and keeps project and tasks', async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      expectApiError(await http(app).delete(`/projects/${project.id}`), 409);
      await http(app).get(`/projects/${project.id}`).expect(200);
      await http(app).get(`/project-tasks/${task.id}`).expect(200);
    });

    it('succeeds once the last task has been removed', async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      await http(app).delete(`/project-tasks/${task.id}`).expect(204);
      await http(app).delete(`/projects/${project.id}`).expect(204);
    });
  });
});
