import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { expectApiError } from './helpers/api-error.js';
import { createTestApp, http } from './helpers/app.js';

/**
 * Task 7 is only finished when the REAL AppModule serves the media routes with
 * the configuration read from the environment (STORAGE_LOCAL_ROOT is set by
 * test/helpers/test-env.ts). It lives in its own file because it starts a
 * second application, which must not share a database connection with the
 * suite in media.e2e-spec.ts.
 */
describe('MediaModule registration (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['POST', '/media/upload'],
    ['POST', '/media/upload/multiple'],
    ['GET', '/media'],
    ['GET', '/media/2f0f9a3e-8f5a-4d8e-9b7c-1b2c3d4e5f60'],
  ] as const)('%s %s exists in AppModule and requires a token (401, not 404)', async (method, url) => {
    const res = await (method === 'POST' ? http(app).post(url) : http(app).get(url));
    expectApiError(res, 401);
  });
});
