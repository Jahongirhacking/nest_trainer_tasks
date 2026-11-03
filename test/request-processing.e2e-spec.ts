import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { expectApiError } from './helpers/api-error.js';
import { createTestApp, http, resetDatabase } from './helpers/app.js';
import { bearer, registerAndLogin } from './helpers/auth.js';

/**
 * Task 6 against the REAL application (AppModule, the env-driven config
 * provider, PostgreSQL TEST database). This only passes when
 * RequestProcessingModule is imported by AppModule (see ASSIGNMENT.md,
 * "Implementation checklist"). The detailed behaviour is covered, without a
 * database, by src/common/**\/*.spec.ts.
 */
describe('Request processing (e2e, PostgreSQL)', () => {
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

  it('adds a request id header to every response, even a 401', async () => {
    const res = await http(app).get('/tasks/my');
    expect(res.status).toBe(401);
    expect(res.headers['x-request-id']).toMatch(/^[A-Za-z0-9-]{8,64}$/);
  });

  it('hands the request metadata to the controller', async () => {
    const { token } = await registerAndLogin(app);
    const res = await http(app)
      .get('/tasks/request-info')
      .set(...bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('identifies the authenticated user next to the request id', async () => {
    const { token, user } = await registerAndLogin(app);
    const res = await http(app)
      .get('/tasks/processing-info')
      .set(...bearer(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      requestId: res.headers['x-request-id'],
      userId: user.id,
    });
  });

  it('keeps authorization before validation (USER: 403, never 400)', async () => {
    const { token } = await registerAndLogin(app);
    const bad = await http(app)
      .get('/tasks/abc')
      .set(...bearer(token));
    expectApiError(bad, 403);
    const list = await http(app)
      .get('/tasks?limit=abc')
      .set(...bearer(token));
    expectApiError(list, 403);
  });

  it('answers 401 for anonymous callers on the new routes', async () => {
    expectApiError(await http(app).get('/tasks/request-info'), 401);
    expectApiError(await http(app).get('/tasks/processing-info'), 401);
    expectApiError(await http(app).get('/tasks/skip-timing'), 401);
  });
});
