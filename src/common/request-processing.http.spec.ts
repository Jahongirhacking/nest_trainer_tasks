import type { Response } from 'supertest';
import { createFixture, ids, type Fixture } from '../../test/helpers/rbac-app.js';
import { call } from '../../test/helpers/rbac-http.js';
import type {
  RequestCompletedEntry,
  RequestLogEntry,
  RequestTimingEntry,
} from './interfaces/request-log.interface.js';

/**
 * The whole request lifecycle over real HTTP (README "Request lifecycle"):
 *
 *   middleware -> guards -> interceptor (before) -> pipes -> handler
 *              -> interceptor (after) -> exception filter -> response
 *
 * It runs the REAL controllers, guards, JWT strategy, pipes, interceptor and
 * middleware on in-memory repositories. Nothing about the request processing
 * system is mocked. Assertions never depend on exact timings or log formats.
 */
describe('request processing - HTTP flow', () => {
  let f: Fixture;

  const open = async (options: Parameters<typeof createFixture>[0] = {}) => {
    f = await createFixture(options);
  };

  beforeEach(async () => {
    await open();
  });

  afterEach(async () => {
    await f.app.close();
  });

  const requestIdOf = (res: Response) => res.headers['x-request-id'] as string;

  const entry = <T extends RequestLogEntry>(res: Response, event: T['event']) =>
    f.logs.find((e) => e.requestId === requestIdOf(res) && e.event === event) as
      | T
      | undefined;

  /** The middleware logs on `finish`, which can be a tick after the client gets the response. */
  const completed = async (res: Response) => {
    await vi.waitFor(() =>
      expect(entry<RequestCompletedEntry>(res, 'request.completed')).toBeDefined(),
    );
    return entry<RequestCompletedEntry>(res, 'request.completed')!;
  };

  const timing = (res: Response) => entry<RequestTimingEntry>(res, 'request.timing');

  describe('request metadata reaches the controller', () => {
    it.each([
      ['ADMIN', ids.admin],
      ['MANAGER', ids.manager],
      ['USER', ids.user],
    ])('GET /tasks/request-info as %s', async (_role, id) => {
      const before = Date.now();
      const res = await call(f, 'get', '/tasks/request-info', id).set(
        'User-Agent',
        'http-spec/1.0',
      );
      expect(res.status).toBe(200);
      expect(Object.keys(res.body).sort()).toEqual([
        'clientIp',
        'requestId',
        'startedAt',
        'userAgent',
      ]);
      expect(res.body.requestId).toBe(requestIdOf(res));
      expect(res.body.userAgent).toBe('http-spec/1.0');
      expect(res.body.clientIp).toBeTypeOf('string');
      expect(res.body.clientIp.length).toBeGreaterThan(0);
      const startedAt = Date.parse(res.body.startedAt);
      expect(startedAt).toBeGreaterThanOrEqual(before - 1000);
      expect(startedAt).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it('never leaks the request headers or the token into the metadata', async () => {
      const res = await call(f, 'get', '/tasks/request-info', ids.user);
      expect(res.body.requestId).toBe(requestIdOf(res));
      expect(JSON.stringify(res.body)).not.toMatch(/bearer|authorization|passwordHash/i);
    });

    it('GET /tasks/processing-info combines the request id and the authenticated user', async () => {
      const res = await call(f, 'get', '/tasks/processing-info', ids.manager);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        requestId: requestIdOf(res),
        userId: ids.manager,
      });
    });

    it('is not captured by the :id route (request-info is not an id)', async () => {
      const res = await call(f, 'get', '/tasks/request-info', ids.admin);
      expect(res.status).toBe(200);
      expect(res.body.requestId).toBe(requestIdOf(res));
    });
  });

  describe('timing', () => {
    it('measures a successful async handler', async () => {
      const res = await call(f, 'get', '/tasks/processing-info', ids.user);
      expect(res.status).toBe(200);
      const t = timing(res)!;
      expect(t).toBeDefined();
      expect(t).toMatchObject({ outcome: 'success', statusCode: 200, method: 'GET' });
      expect(t.url).toContain('/tasks/processing-info');
      // the handler waits ~50 ms; allow timer jitter, do not demand equality
      expect(t.durationMs).toBeGreaterThanOrEqual(40);
      expect(t.durationMs).toBeLessThan(5000);
    });

    it('logs exactly one timing entry per request', async () => {
      const res = await call(f, 'get', '/tasks/processing-info', ids.user);
      expect(f.logs.filter((e) => e.event === 'request.timing' && e.requestId === requestIdOf(res))).toHaveLength(1);
    });

    it('the middleware sees the whole request, the interceptor only the handler path', async () => {
      const res = await call(f, 'get', '/tasks/processing-info', ids.user);
      const whole = await completed(res);
      // generous tolerance: two clocks, rounding
      expect(whole.durationMs).toBeGreaterThanOrEqual(timing(res)!.durationMs - 5);
    });

    it('measures a failing request and keeps the response unchanged', async () => {
      const res = await call(f, 'get', '/tasks/9999', ids.admin);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ statusCode: 404, error: 'Not Found' });
      expect(timing(res)).toMatchObject({ outcome: 'error', statusCode: 404 });
    });

    it('does not time a route marked with @SkipRequestTiming()', async () => {
      const res = await call(f, 'get', '/tasks/skip-timing', ids.user);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ timed: false });
      await completed(res); // the middleware still logs it
      expect(timing(res)).toBeUndefined();
    });

    it('logs no timing entries when timing logs are disabled', async () => {
      await f.app.close();
      await open({ requestConfig: { timingLogsEnabled: false } });
      const ok = await call(f, 'get', '/tasks/processing-info', ids.user);
      const failed = await call(f, 'get', '/tasks/9999', ids.admin);
      expect(ok.status).toBe(200);
      expect(failed.status).toBe(404);
      expect(f.logs.filter((e) => e.event === 'request.timing')).toEqual([]);
    });
  });

  describe('lifecycle order: guards run before interceptors and pipes', () => {
    it('401: the guard rejects the request, so no interceptor runs (no timing entry)', async () => {
      const res = await call(f, 'get', '/tasks/processing-info');
      expect(res.status).toBe(401);
      expect(requestIdOf(res)).toBeTruthy();
      expect((await completed(res)).statusCode).toBe(401);
      expect(timing(res)).toBeUndefined();
    });

    it('403: the role guard rejects the request, so no timing entry either', async () => {
      const res = await call(f, 'get', '/tasks', ids.user);
      expect(res.status).toBe(403);
      expect((await completed(res)).statusCode).toBe(403);
      expect(timing(res)).toBeUndefined();
    });

    it('a pipe error happens INSIDE the interceptor: timed as an error with status 400', async () => {
      const res = await call(f, 'get', '/tasks/abc', ids.admin);
      expect(res.status).toBe(400);
      expect(timing(res)).toMatchObject({ outcome: 'error', statusCode: 400 });
    });

    it('authorization wins over validation: a USER sending a bad id gets 403, not 400', async () => {
      // the bad id really is invalid for someone who is allowed to ask
      expect((await call(f, 'get', '/tasks/abc', ids.admin)).status).toBe(400);
      expect((await call(f, 'get', '/tasks/abc', ids.user)).status).toBe(403);
      expect((await call(f, 'get', '/tasks?limit=abc', ids.user)).status).toBe(403);
    });

    it('anonymous callers get 401, not 400, for bad input', async () => {
      expect((await call(f, 'get', '/tasks/abc')).status).toBe(401);
      expect((await call(f, 'get', '/tasks?limit=abc')).status).toBe(401);
      expect((await call(f, 'get', '/tasks/request-info')).status).toBe(401);
    });
  });

  describe('GET /tasks/:id (ParseResourceIdPipe)', () => {
    it.each([
      ['ADMIN', ids.admin],
      ['MANAGER', ids.manager],
    ])('%s reads a task by a valid id', async (_role, id) => {
      const task = f.seedTask({ title: 'Read me' });
      const res = await call(f, 'get', `/tasks/${task.id}`, id);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: task.id, title: 'Read me' });
    });

    it('answers 404 for a valid id that does not exist', async () => {
      expect((await call(f, 'get', '/tasks/9999', ids.admin)).status).toBe(404);
    });

    it.each(['abc', '0', '-1', '1.5', '1e3', '0x10', '12abc', '1%20OR%201=1'])(
      'answers 400 in the API error format for the id "%s"',
      async (badId) => {
        const res = await call(f, 'get', `/tasks/${badId}`, ids.admin);
        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
        expect(res.body.message).toBeTypeOf('string');
      },
    );

    it('never runs the handler for an invalid id', async () => {
      f.seedTask();
      const res = await call(f, 'get', '/tasks/abc', ids.admin);
      expect(res.status).toBe(400);
      expect(f.tasks.findOne).not.toHaveBeenCalled();
    });
  });

  describe('GET /tasks?page=&limit= (PaginationPipe)', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i += 1) f.seedTask({ title: `Task ${i}` });
    });

    const idsOf = (res: Response) => res.body.map((t: { id: number }) => t.id);
    const range = (from: number, to: number) =>
      Array.from({ length: to - from + 1 }, (_, i) => from + i);

    it('returns the first page of the default size when no query is sent', async () => {
      const res = await call(f, 'get', '/tasks', ids.admin);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(idsOf(res)).toEqual(range(1, 10));
    });

    it('converts numeric strings: ?page=2&limit=10', async () => {
      const res = await call(f, 'get', '/tasks?page=2&limit=10', ids.manager);
      expect(res.status).toBe(200);
      expect(idsOf(res)).toEqual(range(11, 20));
    });

    it('returns a short last page and an empty page past the end', async () => {
      expect(idsOf(await call(f, 'get', '/tasks?page=3&limit=10', ids.admin))).toEqual(range(21, 25));
      const beyond = await call(f, 'get', '/tasks?page=99&limit=10', ids.admin);
      expect(beyond.status).toBe(200);
      expect(beyond.body).toEqual([]);
    });

    it('accepts the maximum page size and rejects one more', async () => {
      const max = await call(f, 'get', '/tasks?limit=50', ids.admin);
      expect(max.status).toBe(200);
      expect(max.body).toHaveLength(25);
      const tooMany = await call(f, 'get', '/tasks?limit=51', ids.admin);
      expect(tooMany.status).toBe(400);
      expect(tooMany.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    });

    it.each([
      'page=0',
      'page=-1',
      'page=abc',
      'page=1.5',
      'page=',
      'limit=0',
      'limit=-3',
      'limit=abc',
      'limit=',
      'page=1&page=2',
      'limit=5&limit=6',
    ])('answers 400 for ?%s', async (query) => {
      const res = await call(f, 'get', `/tasks?${query}`, ids.admin);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    });

    it('takes the maximum from the configuration', async () => {
      await f.app.close();
      await open({ requestConfig: { maxPageSize: 5 } });
      for (let i = 1; i <= 12; i += 1) f.seedTask();
      expect((await call(f, 'get', '/tasks?limit=6', ids.admin)).status).toBe(400);
      const res = await call(f, 'get', '/tasks?limit=5&page=3', ids.admin);
      expect(idsOf(res)).toEqual(range(11, 12));
      // the default page size never exceeds the maximum
      expect((await call(f, 'get', '/tasks', ids.admin)).body).toHaveLength(5);
    });
  });

  describe('Task 5 RBAC behaviour is intact', () => {
    it('keeps the access matrix for the original routes', async () => {
      const task = f.seedTask();
      expect((await call(f, 'get', '/tasks')).status).toBe(401);
      expect((await call(f, 'get', '/tasks', ids.user)).status).toBe(403);
      expect((await call(f, 'get', '/tasks', ids.manager)).status).toBe(200);
      expect((await call(f, 'get', `/tasks/${task.id}`, ids.user)).status).toBe(403);
      expect((await call(f, 'delete', `/tasks/${task.id}`, ids.manager)).status).toBe(403);
      expect((await call(f, 'get', '/tasks/my', ids.user)).status).toBe(200);
    });

    it('keeps the ownership and assignment rules', async () => {
      const theirs = f.seedTask({ assigneeId: ids.otherUser }).id;
      const unassigned = f.seedTask().id;
      expect(
        (await call(f, 'patch', `/tasks/${theirs}/status`, ids.user, { status: 'done' })).status,
      ).toBe(403);
      expect(
        (await call(f, 'patch', `/tasks/${unassigned}/assign`, ids.manager, { assigneeId: ids.admin }))
          .status,
      ).toBe(403);
    });
  });

  describe('sensitive data', () => {
    it('no entry produced by a whole session contains a token or a password', async () => {
      const token = f.tokenFor(ids.admin);
      await call(f, 'get', '/tasks/processing-info', ids.admin);
      await call(f, 'get', '/tasks/abc?token=URL-SECRET-1', ids.admin);
      await call(f, 'post', '/tasks', ids.admin, { title: 'x', password: 'BODY-SECRET-2' });
      await call(f, 'get', '/tasks/my');
      await vi.waitFor(() =>
        expect(f.logs.filter((e) => e.event === 'request.completed')).toHaveLength(4),
      );
      const everything = JSON.stringify(f.logs);
      expect(everything).not.toContain(token);
      expect(everything).not.toContain('URL-SECRET-1');
      expect(everything).not.toContain('BODY-SECRET-2');
    });
  });
});
