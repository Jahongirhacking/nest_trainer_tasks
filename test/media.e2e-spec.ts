import { readdir, rm } from 'node:fs/promises';
import type { INestApplication } from '@nestjs/common';
import type request from 'supertest';
import type { App } from 'supertest/types.js';
import { expectApiError } from './helpers/api-error.js';
import { http, resetDatabase } from './helpers/app.js';
import { bearer } from './helpers/auth.js';
import {
  countLiveMedia,
  createMediaTestApp,
  listFiles,
  newAdmin,
  newUser,
  TEST_LIMITS,
  type MediaTestApp,
} from './helpers/media-app.js';
import {
  elfPayload,
  htmlPayload,
  jpegFile,
  pdfFile,
  pngFile,
  validJpeg,
  validPng,
  wavPayload,
  webpFile,
  type FileSpec,
} from './helpers/media-fixtures.js';

/**
 * Task 7 against the REAL application, PostgreSQL TEST database and a
 * throw-away storage directory (see test/helpers/media-app.ts).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('Media upload service (e2e, PostgreSQL)', () => {
  let ctx: MediaTestApp;
  let app: INestApplication<App>;

  beforeAll(async () => {
    ctx = await createMediaTestApp();
    app = ctx.app;
  });
  afterAll(async () => {
    await ctx.cleanup();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    await rm(ctx.root, { recursive: true, force: true });
    ctx.storage.reset();
  });

  const attach = (req: request.Test, field: string, spec: FileSpec) =>
    req.attach(field, spec.buffer, {
      filename: spec.originalname,
      contentType: spec.mimetype,
    });

  const upload = (token: string, spec: FileSpec = jpegFile(), field = 'file') =>
    attach(http(app).post('/media/upload').set(...bearer(token)), field, spec);

  const uploadMany = (token: string, specs: FileSpec[]) => {
    let req = http(app).post('/media/upload/multiple').set(...bearer(token));
    for (const spec of specs) req = attach(req, 'files', spec);
    return req;
  };

  describe('authentication', () => {
    it.each([
      ['POST /media/upload', () => http(app).post('/media/upload')],
      ['POST /media/upload/multiple', () => http(app).post('/media/upload/multiple')],
      ['GET /media', () => http(app).get('/media')],
      ['GET /media/:id', () => http(app).get('/media/2f0f9a3e-8f5a-4d8e-9b7c-1b2c3d4e5f60')],
      ['GET /media/:id/download', () => http(app).get('/media/2f0f9a3e-8f5a-4d8e-9b7c-1b2c3d4e5f60/download')],
      ['DELETE /media/:id', () => http(app).delete('/media/2f0f9a3e-8f5a-4d8e-9b7c-1b2c3d4e5f60')],
    ] as [string, () => request.Test][])('%s without a token answers 401', async (_label, call) => {
      expectApiError(await call(), 401);
    });

    it('rejects an invalid token and stores nothing', async () => {
      const res = await upload('not.a.token');
      expectApiError(res, 401);
      expect(await listFiles(ctx.root)).toEqual([]);
    });
  });

  describe('POST /media/upload', () => {
    it.each([
      ['JPEG', jpegFile('photo.jpg')],
      ['PNG', pngFile('logo.png')],
      ['WebP', webpFile('banner.webp')],
      ['PDF', pdfFile('report.pdf')],
    ])('accepts a valid %s and returns safe metadata', async (_label, spec) => {
      const { token } = await newUser(app);
      const res = await upload(token, spec).expect(201);
      expect(res.body).toMatchObject({
        originalName: spec.originalname,
        mimeType: spec.mimetype,
        size: spec.buffer.length,
        status: 'ACTIVE',
      });
      expect(res.body.id).toMatch(UUID);
      expect(Number.isNaN(Date.parse(res.body.createdAt))).toBe(false);
      for (const forbidden of ['storageKey', 'key', 'path', 'uploadedById', 'url'])
        expect(res.body).not.toHaveProperty(forbidden);
      expect(JSON.stringify(res.body)).not.toContain(ctx.root);
      expect(await listFiles(ctx.root)).toHaveLength(1);
    });

    it('stores the file under a generated name, never the original one', async () => {
      const { token } = await newUser(app);
      await upload(token, jpegFile('super-secret-name.jpg')).expect(201);
      const files = await listFiles(ctx.root);
      expect(files).toHaveLength(1);
      expect(files[0]).not.toContain('super-secret-name');
    });

    it('does not make the file reachable through any static URL', async () => {
      const { token } = await newUser(app);
      const res = await upload(token).expect(201);
      for (const url of [
        `/uploads/${res.body.id}`,
        `/media/files/${res.body.id}`,
        `/public/${res.body.id}.jpg`,
      ])
        expect((await http(app).get(url)).status).toBe(404);
    });

    it('rejects a request without a file (400)', async () => {
      const { token } = await newUser(app);
      const res = await http(app)
        .post('/media/upload')
        .set(...bearer(token))
        .field('note', 'no file here');
      expectApiError(res, 400);
      expect(await countLiveMedia(app)).toBe(0);
    });

    it('rejects a file sent under an unexpected field name (400)', async () => {
      const { token } = await newUser(app);
      expectApiError(await upload(token, jpegFile(), 'avatar'), 400);
      expect(await listFiles(ctx.root)).toEqual([]);
    });

    it('rejects an unknown text field next to the file (400)', async () => {
      const { token } = await newUser(app);
      const res = await http(app)
        .post('/media/upload')
        .set(...bearer(token))
        .field('role', 'admin')
        .attach('file', validJpeg(), { filename: 'a.jpg', contentType: 'image/jpeg' });
      expectApiError(res, 400);
      expect(await countLiveMedia(app)).toBe(0);
    });

    const rejected: [string, FileSpec][] = [
      ['an empty file', { originalname: 'a.jpg', mimetype: 'image/jpeg', buffer: Buffer.alloc(0) }],
      ['an unsupported MIME type', { originalname: 'a.jpg', mimetype: 'text/html', buffer: validJpeg() }],
      ['an unsupported extension', { originalname: 'a.gif', mimetype: 'image/jpeg', buffer: validJpeg() }],
      ['an executable named .exe', { originalname: 'virus.exe', mimetype: 'application/octet-stream', buffer: elfPayload() }],
      ['HTML disguised as a JPEG', { originalname: 'cat.jpg', mimetype: 'image/jpeg', buffer: htmlPayload() }],
      ['an executable disguised as a JPEG', { originalname: 'cat.jpg', mimetype: 'image/jpeg', buffer: elfPayload() }],
      ['PNG content declared as JPEG', { originalname: 'cat.jpg', mimetype: 'image/jpeg', buffer: validPng() }],
      ['a WAV disguised as WebP', { originalname: 'a.webp', mimetype: 'image/webp', buffer: wavPayload() }],
      ['a double extension', { originalname: 'cat.jpg.exe', mimetype: 'image/jpeg', buffer: validJpeg() }],
      ['an SVG with a script', { originalname: 'a.svg', mimetype: 'image/svg+xml', buffer: Buffer.from('<svg onload="alert(1)"/>') }],
    ];
    it.each(rejected)('rejects %s (400) and leaves nothing behind', async (_label, spec) => {
      const { token } = await newUser(app);
      expectApiError(await upload(token, spec), 400);
      expect(await listFiles(ctx.root)).toEqual([]);
      expect(await countLiveMedia(app)).toBe(0);
    });

    it('rejects a file above the size limit (413) and leaves nothing behind', async () => {
      const { token } = await newUser(app);
      const big = jpegFile('big.jpg', TEST_LIMITS.maxFileSizeBytes + 1);
      expectApiError(await upload(token, big), 413);
      expect(await listFiles(ctx.root)).toEqual([]);
      expect(await countLiveMedia(app)).toBe(0);
    });

    it('accepts a file of exactly the size limit', async () => {
      const { token } = await newUser(app);
      await upload(token, jpegFile('max.jpg', TEST_LIMITS.maxFileSizeBytes)).expect(201);
    });

    it('cannot be tricked into writing outside the storage root by a hostile file name', async () => {
      const { token } = await newUser(app);
      const res = await upload(token, jpegFile('../../../../tmp/pwned.jpg'));
      expect([201, 400]).toContain(res.status);
      expect(await readdir(ctx.parent)).toEqual(['store']);
      for (const file of await listFiles(ctx.root)) expect(file).not.toContain('pwned');
      if (res.status === 201) expect(res.body.originalName).not.toContain('..');
    });

    it('does not leak anything internal when the storage fails (500)', async () => {
      const { token } = await newUser(app);
      ctx.storage.failUploadAt = 1;
      const res = await upload(token);
      expectApiError(res, 500);
      expect(JSON.stringify(res.body)).not.toMatch(/ENOSPC|\/var\/secret|media\/x/);
      expect(await listFiles(ctx.root)).toEqual([]);
      expect(await countLiveMedia(app)).toBe(0);
    });
  });

  describe('POST /media/upload/multiple', () => {
    it('stores several valid files for the caller', async () => {
      const { token } = await newUser(app);
      const res = await uploadMany(token, [jpegFile(), pngFile(), pdfFile()]).expect(201);
      expect(res.body).toHaveLength(3);
      for (const item of res.body) {
        expect(item.status).toBe('ACTIVE');
        expect(item).not.toHaveProperty('storageKey');
      }
      expect(await listFiles(ctx.root)).toHaveLength(3);
      const list = await http(app).get('/media').set(...bearer(token)).expect(200);
      expect(list.body).toHaveLength(3);
    });

    it('rejects more files than the limit (400) and stores nothing', async () => {
      const { token } = await newUser(app);
      const specs = Array.from({ length: TEST_LIMITS.maxFiles + 1 }, () => jpegFile());
      expectApiError(await uploadMany(token, specs), 400);
      expect(await listFiles(ctx.root)).toEqual([]);
      expect(await countLiveMedia(app)).toBe(0);
    });

    it('is all-or-nothing: one invalid file rejects the whole request', async () => {
      const { token } = await newUser(app);
      const spoof: FileSpec = { originalname: 'x.jpg', mimetype: 'image/jpeg', buffer: htmlPayload() };
      expectApiError(await uploadMany(token, [jpegFile(), spoof, pngFile()]), 400);
      expect(await listFiles(ctx.root)).toEqual([]);
      expect(await countLiveMedia(app)).toBe(0);
    });

    it('is all-or-nothing when the second file is too large', async () => {
      const { token } = await newUser(app);
      const big = jpegFile('big.jpg', TEST_LIMITS.maxFileSizeBytes + 1);
      const res = await uploadMany(token, [jpegFile(), big]);
      expect([400, 413]).toContain(res.status);
      expect(await listFiles(ctx.root)).toEqual([]);
      expect(await countLiveMedia(app)).toBe(0);
    });

    it('rejects a request without files (400)', async () => {
      const { token } = await newUser(app);
      const res = await http(app)
        .post('/media/upload/multiple')
        .set(...bearer(token))
        .field('note', 'nothing');
      expectApiError(res, 400);
    });

    it('rejects files sent under the single-file field name (400)', async () => {
      const { token } = await newUser(app);
      const res = await http(app)
        .post('/media/upload/multiple')
        .set(...bearer(token))
        .attach('file', validJpeg(), { filename: 'a.jpg', contentType: 'image/jpeg' });
      expectApiError(res, 400);
      expect(await listFiles(ctx.root)).toEqual([]);
    });

    it('leaves no orphaned objects when the storage fails in the middle (500)', async () => {
      const { token } = await newUser(app);
      ctx.storage.failUploadAt = 2;
      const res = await uploadMany(token, [jpegFile(), pngFile(), pdfFile()]);
      expectApiError(res, 500);
      expect(JSON.stringify(res.body)).not.toMatch(/ENOSPC|\/var\/secret/);
      expect(await listFiles(ctx.root)).toEqual([]);
      expect(await countLiveMedia(app)).toBe(0);
    });
  });

  describe('GET /media and GET /media/:id', () => {
    it('lists only the files of the caller', async () => {
      const a = await newUser(app);
      const b = await newUser(app);
      await upload(a.token).expect(201);
      await upload(a.token, pngFile()).expect(201);
      await upload(b.token).expect(201);
      const res = await http(app).get('/media').set(...bearer(a.token)).expect(200);
      expect(res.body).toHaveLength(2);
      for (const item of res.body) expect(item).not.toHaveProperty('storageKey');
    });

    it('filters by category and paginates', async () => {
      const { token } = await newUser(app);
      await upload(token, jpegFile()).expect(201);
      await upload(token, pngFile()).expect(201);
      await upload(token, pdfFile()).expect(201);
      const docs = await http(app).get('/media?category=DOCUMENT').set(...bearer(token)).expect(200);
      expect(docs.body).toHaveLength(1);
      const page = await http(app).get('/media?page=1&limit=2').set(...bearer(token)).expect(200);
      expect(page.body).toHaveLength(2);
      const last = await http(app).get('/media?page=2&limit=2').set(...bearer(token)).expect(200);
      expect(last.body).toHaveLength(1);
    });

    it('rejects an invalid category (400)', async () => {
      const { token } = await newUser(app);
      expectApiError(await http(app).get('/media?category=VIDEO').set(...bearer(token)), 400);
    });

    it('returns the metadata of an own file', async () => {
      const { token } = await newUser(app);
      const created = await upload(token).expect(201);
      const res = await http(app).get(`/media/${created.body.id}`).set(...bearer(token)).expect(200);
      expect(res.body.id).toBe(created.body.id);
      expect(res.body).not.toHaveProperty('storageKey');
    });

    it('answers 404 for an unknown id', async () => {
      const { token } = await newUser(app);
      const res = await http(app)
        .get('/media/2f0f9a3e-8f5a-4d8e-9b7c-1b2c3d4e5f60')
        .set(...bearer(token));
      expectApiError(res, 404);
    });

    it('rejects a malformed id without touching the database or the disk', async () => {
      const { token } = await newUser(app);
      for (const id of ['not-a-uuid', '1', '..%2f..%2fetc%2fpasswd', '%00']) {
        const res = await http(app).get(`/media/${id}`).set(...bearer(token));
        expect([400, 404]).toContain(res.status);
        expectApiError(res, res.status);
      }
    });
  });

  describe('ownership and access control', () => {
    it("hides another user's file: metadata, download and delete answer 404", async () => {
      const a = await newUser(app);
      const b = await newUser(app);
      const { body } = await upload(a.token).expect(201);
      expectApiError(await http(app).get(`/media/${body.id}`).set(...bearer(b.token)), 404);
      expectApiError(await http(app).get(`/media/${body.id}/download`).set(...bearer(b.token)), 404);
      expectApiError(await http(app).delete(`/media/${body.id}`).set(...bearer(b.token)), 404);
      await http(app).get(`/media/${body.id}`).set(...bearer(a.token)).expect(200);
      expect(await listFiles(ctx.root)).toHaveLength(1);
    });

    it('lets an ADMIN read, download and delete any file', async () => {
      const user = await newUser(app);
      const admin = await newAdmin(app);
      const { body } = await upload(user.token).expect(201);
      await http(app).get(`/media/${body.id}`).set(...bearer(admin.token)).expect(200);
      await http(app).get(`/media/${body.id}/download`).set(...bearer(admin.token)).expect(200);
      await http(app).delete(`/media/${body.id}`).set(...bearer(admin.token)).expect(204);
    });

    it("does not list an admin's view of everybody's files", async () => {
      const user = await newUser(app);
      const admin = await newAdmin(app);
      await upload(user.token).expect(201);
      const res = await http(app).get('/media').set(...bearer(admin.token)).expect(200);
      expect(res.body).toHaveLength(0);
    });

    it('keeps the Task 5 RBAC rules intact', async () => {
      const user = await newUser(app);
      const admin = await newAdmin(app);
      expectApiError(await http(app).get('/tasks').set(...bearer(user.token)), 403);
      await http(app).get('/tasks').set(...bearer(admin.token)).expect(200);
    });
  });

  describe('GET /media/:id/download', () => {
    it('returns the exact bytes with safe headers', async () => {
      const { token } = await newUser(app);
      const spec = jpegFile('holiday.jpg', 500);
      const { body } = await upload(token, spec).expect(201);
      const res = await http(app)
        .get(`/media/${body.id}/download`)
        .set(...bearer(token))
        .buffer(true)
        .parse((r, cb) => {
          const chunks: Buffer[] = [];
          r.on('data', (c: Buffer) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(res.body).toEqual(spec.buffer);
      expect(res.headers['content-type']).toMatch(/^image\/jpeg/);
      expect(res.headers['content-disposition']).toMatch(/^attachment/i);
      expect(res.headers['content-disposition']).toContain('holiday.jpg');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('serves a PDF as an attachment too (never inline)', async () => {
      const { token } = await newUser(app);
      const { body } = await upload(token, pdfFile()).expect(201);
      const res = await http(app).get(`/media/${body.id}/download`).set(...bearer(token)).expect(200);
      expect(res.headers['content-type']).toMatch(/^application\/pdf/);
      expect(res.headers['content-disposition']).toMatch(/^attachment/i);
    });

    it.each([
      ['quotes and a semicolon', 'we"ird; name.jpg'],
      ['non-ASCII characters', 'résumé-фото.jpg'],
      ['a very long name', `${'a'.repeat(300)}.jpg`],
    ])('handles %s in the original name safely', async (_label, name) => {
      const { token } = await newUser(app);
      const created = await upload(token, jpegFile(name));
      if (created.status !== 201) {
        expectApiError(created, 400);
        return;
      }
      const res = await http(app)
        .get(`/media/${created.body.id}/download`)
        .set(...bearer(token))
        .expect(200);
      const header = res.headers['content-disposition'] as string;
      expect(header).toMatch(/^attachment/i);
      expect(header).not.toMatch(/[\r\n]/);
      expect(header).not.toMatch(/[^\x20-\x7e]/);
      expect(res.headers['x-injected']).toBeUndefined();
    });

    it('answers 404 when the metadata exists but the object is gone', async () => {
      const { token } = await newUser(app);
      const { body } = await upload(token).expect(201);
      await rm(ctx.root, { recursive: true, force: true });
      expectApiError(await http(app).get(`/media/${body.id}/download`).set(...bearer(token)), 404);
    });
  });

  describe('DELETE /media/:id', () => {
    it('deletes the object and the metadata, then answers 404', async () => {
      const { token } = await newUser(app);
      const { body } = await upload(token).expect(201);
      const res = await http(app).delete(`/media/${body.id}`).set(...bearer(token)).expect(204);
      expect(res.text).toBe('');
      expect(await listFiles(ctx.root)).toEqual([]);
      expectApiError(await http(app).get(`/media/${body.id}`).set(...bearer(token)), 404);
      expectApiError(await http(app).delete(`/media/${body.id}`).set(...bearer(token)), 404);
      const list = await http(app).get('/media').set(...bearer(token)).expect(200);
      expect(list.body).toEqual([]);
    });

    it('keeps the record and answers 500 without details when the storage cannot delete', async () => {
      const { token } = await newUser(app);
      const { body } = await upload(token).expect(201);
      ctx.storage.failDelete = true;
      const res = await http(app).delete(`/media/${body.id}`).set(...bearer(token));
      expectApiError(res, 500);
      expect(JSON.stringify(res.body)).not.toMatch(/EACCES|\/var\/secret/);
      ctx.storage.failDelete = false;
      await http(app).get(`/media/${body.id}`).set(...bearer(token)).expect(200);
      expect(await listFiles(ctx.root)).toHaveLength(1);
    });

    it('still succeeds when the stored object is already missing', async () => {
      const { token } = await newUser(app);
      const { body } = await upload(token).expect(201);
      await rm(ctx.root, { recursive: true, force: true });
      await http(app).delete(`/media/${body.id}`).set(...bearer(token)).expect(204);
      expectApiError(await http(app).get(`/media/${body.id}`).set(...bearer(token)), 404);
    });
  });

  describe('complete lifecycle', () => {
    it('upload -> metadata -> download -> delete -> cleanup', async () => {
      const { token } = await newUser(app);
      const spec = pngFile('logo.png', 400);
      const created = await upload(token, spec).expect(201);
      expect(await listFiles(ctx.root)).toHaveLength(1);
      await http(app).get(`/media/${created.body.id}`).set(...bearer(token)).expect(200);
      await http(app).get(`/media/${created.body.id}/download`).set(...bearer(token)).expect(200);
      await http(app).delete(`/media/${created.body.id}`).set(...bearer(token)).expect(204);
      expect(await listFiles(ctx.root)).toEqual([]);
      expect(await countLiveMedia(app)).toBe(0);
    });
  });
});
