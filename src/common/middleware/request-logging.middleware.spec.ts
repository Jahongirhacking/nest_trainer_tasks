import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { createFixture, ids, type Fixture } from '../../../test/helpers/rbac-app.js';
import { call } from '../../../test/helpers/rbac-http.js';
import type {
  RequestCompletedEntry,
  RequestLogEntry,
  RequestStartedEntry,
} from '../interfaces/request-log.interface.js';
import type { RequestProcessingConfig } from '../interfaces/request-processing-config.interface.js';
import { REQUEST_METADATA_PROPERTY } from '../tokens/request-processing.tokens.js';
import { RequestLoggingMiddleware } from './request-logging.middleware.js';

/**
 * Module A. Two layers:
 *  1. the class on its own, with hand-made request/response objects
 *  2. the middleware as registered in RequestProcessingModule, over real HTTP
 */

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

const CONFIG: RequestProcessingConfig = {
  requestLoggingEnabled: true,
  timingLogsEnabled: true,
  maxPageSize: 50,
  requestIdHeader: 'x-request-id',
  environment: 'test',
};

/** Express-like objects that support every common way of reading/writing. */
function fakeHttp(headers: Record<string, string> = {}) {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const sent: Record<string, string> = {};
  const req = {
    method: 'GET',
    url: '/tasks?page=2',
    originalUrl: '/tasks?page=2',
    ip: '203.0.113.7',
    ips: [],
    socket: { remoteAddress: '203.0.113.7' },
    headers: lower,
    get: (name: string) => lower[name.toLowerCase()],
    header: (name: string) => lower[name.toLowerCase()],
  } as unknown as Request;
  const res = Object.assign(new EventEmitter(), {
    statusCode: 200,
    setHeader(name: string, value: string) {
      sent[name.toLowerCase()] = String(value);
      return this;
    },
    set(name: string, value: string) {
      return this.setHeader(name, value);
    },
    header(name: string, value: string) {
      return this.setHeader(name, value);
    },
    append(name: string, value: string) {
      return this.setHeader(name, value);
    },
    getHeader: (name: string) => sent[name.toLowerCase()],
  }) as unknown as Response;
  return { req, res, sent };
}

describe('RequestLoggingMiddleware (unit)', () => {
  let entries: RequestLogEntry[];

  beforeEach(() => {
    entries = [];
  });

  const build = (config: Partial<RequestProcessingConfig> = {}) =>
    new RequestLoggingMiddleware(
      { ...CONFIG, ...config },
      { log: (entry) => entries.push(entry) },
    );

  const metadataOf = (req: Request) =>
    (req as unknown as Record<string, unknown>)[REQUEST_METADATA_PROPERTY] as
      | Record<string, unknown>
      | undefined;

  it('calls next() exactly once', () => {
    const { req, res } = fakeHttp();
    const next = vi.fn();
    build().use(req, res, next as NextFunction);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a request id and sends it in the configured header', () => {
    const { req, res, sent } = fakeHttp();
    build().use(req, res, vi.fn());
    expect(sent['x-request-id']).toMatch(REQUEST_ID);

    const other = fakeHttp();
    build({ requestIdHeader: 'x-correlation-id' }).use(other.req, other.res, vi.fn());
    expect(other.sent['x-correlation-id']).toMatch(REQUEST_ID);
    expect(other.sent['x-request-id']).toBeUndefined();
  });

  it('attaches exactly { requestId, startedAt, clientIp, userAgent } to the request', () => {
    const { req, res, sent } = fakeHttp({ 'User-Agent': 'spec-agent/1.0' });
    build().use(req, res, vi.fn());
    const metadata = metadataOf(req);
    expect(metadata).toBeDefined();
    expect(Object.keys(metadata!).sort()).toEqual([
      'clientIp',
      'requestId',
      'startedAt',
      'userAgent',
    ]);
    expect(metadata!.requestId).toBe(sent['x-request-id']);
    expect(metadata!.startedAt).toBeInstanceOf(Date);
    expect(Math.abs(Date.now() - (metadata!.startedAt as Date).getTime())).toBeLessThan(2000);
    expect(metadata!.clientIp).toBe('203.0.113.7');
    expect(metadata!.userAgent).toBe('spec-agent/1.0');
  });

  it('records a missing User-Agent as undefined', () => {
    const { req, res } = fakeHttp();
    build().use(req, res, vi.fn());
    expect(metadataOf(req)!.userAgent).toBeUndefined();
  });

  it('gives every request a different id', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const { req, res, sent } = fakeHttp();
      build().use(req, res, vi.fn());
      ids.add(sent['x-request-id']);
    }
    expect(ids.size).toBe(200);
  });

  it('never trusts an id sent by the client', () => {
    const { req, res, sent } = fakeHttp({ 'X-Request-Id': 'attacker-chosen-id' });
    build().use(req, res, vi.fn());
    expect(sent['x-request-id']).not.toBe('attacker-chosen-id');
    expect(metadataOf(req)!.requestId).not.toBe('attacker-chosen-id');
  });

  it('logs request.started immediately and request.completed on `finish`', () => {
    const { req, res, sent } = fakeHttp({ 'User-Agent': 'spec-agent/1.0' });
    build().use(req, res, vi.fn());
    expect(entries.map((e) => e.event)).toEqual(['request.started']);
    const started = entries[0] as RequestStartedEntry;
    expect(started).toMatchObject({
      requestId: sent['x-request-id'],
      method: 'GET',
      clientIp: '203.0.113.7',
      userAgent: 'spec-agent/1.0',
    });
    expect(started.url).toContain('/tasks');
    expect(Number.isNaN(Date.parse(started.timestamp))).toBe(false);

    (res as unknown as { statusCode: number }).statusCode = 404;
    (res as unknown as EventEmitter).emit('finish');
    expect(entries.map((e) => e.event)).toEqual(['request.started', 'request.completed']);
    const completed = entries[1] as RequestCompletedEntry;
    expect(completed.requestId).toBe(sent['x-request-id']);
    expect(completed.statusCode).toBe(404);
    expect(Number.isFinite(completed.durationMs)).toBe(true);
    expect(completed.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('logs nothing when request logging is disabled, but still sets id and header', () => {
    const { req, res, sent } = fakeHttp();
    const next = vi.fn();
    build({ requestLoggingEnabled: false }).use(req, res, next as NextFunction);
    (res as unknown as EventEmitter).emit('finish');
    expect(entries).toEqual([]);
    expect(sent['x-request-id']).toMatch(REQUEST_ID);
    expect(metadataOf(req)!.requestId).toBe(sent['x-request-id']);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('request logging middleware (registered in RequestProcessingModule)', () => {
  let f: Fixture;

  const open = async (requestConfig: Partial<RequestProcessingConfig> = {}) => {
    f = await createFixture({ requestConfig });
  };

  afterEach(async () => {
    await f.app.close();
  });

  const completedFor = (requestId: string) =>
    f.logs.find((e) => e.event === 'request.completed' && e.requestId === requestId);

  it('puts a request id header on every response, whatever the status', async () => {
    await open();
    const responses = await Promise.all([
      call(f, 'get', '/tasks/my', ids.user), // 200
      call(f, 'get', '/tasks/my'), // 401 - rejected by a guard
      call(f, 'get', '/tasks', ids.user), // 403
      call(f, 'post', '/tasks', ids.admin, {}), // 400
      call(f, 'get', '/this-route-does-not-exist', ids.admin), // 404, no route
    ]);
    expect(responses.map((r) => r.status)).toEqual([200, 401, 403, 400, 404]);
    for (const res of responses)
      expect(res.headers['x-request-id']).toMatch(REQUEST_ID);
  });

  it('gives concurrent requests different ids', async () => {
    await open();
    const responses = await Promise.all(
      Array.from({ length: 20 }, () => call(f, 'get', '/tasks/my', ids.user)),
    );
    const seen = new Set(responses.map((r) => r.headers['x-request-id']));
    expect(seen.size).toBe(20);
  });

  it('ignores an id supplied by the client', async () => {
    await open();
    const res = await call(f, 'get', '/tasks/my', ids.user).set(
      'X-Request-Id',
      'attacker-chosen-id',
    );
    expect(res.headers['x-request-id']).toMatch(REQUEST_ID);
    expect(res.headers['x-request-id']).not.toBe('attacker-chosen-id');
    expect(f.logs.some((e) => e.requestId === 'attacker-chosen-id')).toBe(false);
  });

  it('uses the configured header name', async () => {
    await open({ requestIdHeader: 'x-correlation-id' });
    const res = await call(f, 'get', '/tasks/my', ids.user);
    expect(res.headers['x-correlation-id']).toMatch(REQUEST_ID);
    expect(res.headers['x-request-id']).toBeUndefined();
  });

  it('logs request.started then request.completed for the same request id', async () => {
    await open();
    const res = await call(f, 'get', '/tasks/my?page=2', ids.user).set(
      'User-Agent',
      'http-spec/1.0',
    );
    const requestId = res.headers['x-request-id'] as string;
    await vi.waitFor(() => expect(completedFor(requestId)).toBeDefined());

    // (the timing interceptor may add its own entry in between)
    const mine = f.logs.filter(
      (e) => e.requestId === requestId && e.event !== 'request.timing',
    );
    expect(mine.map((e) => e.event)).toEqual(['request.started', 'request.completed']);
    const started = mine[0] as RequestStartedEntry;
    expect(started.method).toBe('GET');
    expect(started.url).toMatch(/^\/tasks\/my/);
    expect(started.userAgent).toBe('http-spec/1.0');
    expect(started.clientIp).toBeTypeOf('string');
    expect(started.clientIp!.length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(started.timestamp))).toBe(false);
    const completed = mine[1] as RequestCompletedEntry;
    expect(completed.statusCode).toBe(200);
    expect(completed.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('records the status of requests rejected before the handler (401, 403)', async () => {
    await open();
    const anonymous = await call(f, 'get', '/tasks/my');
    const forbidden = await call(f, 'get', '/tasks', ids.user);
    for (const [res, status] of [
      [anonymous, 401],
      [forbidden, 403],
    ] as const) {
      const requestId = res.headers['x-request-id'] as string;
      await vi.waitFor(() => expect(completedFor(requestId)).toBeDefined());
      expect((completedFor(requestId) as RequestCompletedEntry).statusCode).toBe(status);
    }
  });

  it('logs nothing when request logging is disabled, yet still sets the header', async () => {
    await open({ requestLoggingEnabled: false });
    const res = await call(f, 'get', '/tasks/my', ids.user);
    expect(res.headers['x-request-id']).toMatch(REQUEST_ID);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(f.logs.filter((e) => e.event.startsWith('request.') && e.event !== 'request.timing')).toEqual([]);
  });

  describe('sensitive data never reaches the logs', () => {
    it('keeps tokens, cookies, passwords and secrets out of every entry', async () => {
      await open();
      const token = f.tokenFor(ids.user);
      const res = await call(
        f,
        'get',
        '/tasks/my?access_token=QUERY-SECRET-456&password=hunter2-ABC&api_key=KEY-SECRET-1&page=2',
        ids.user,
      ).set('Cookie', 'session=SESSION-SECRET-123');
      const requestId = res.headers['x-request-id'] as string;
      await vi.waitFor(() => expect(completedFor(requestId)).toBeDefined());

      const post = await call(f, 'post', '/tasks', ids.admin, {
        title: 'x',
        password: 'BODY-SECRET-789',
      });
      await vi.waitFor(() =>
        expect(completedFor(post.headers['x-request-id'] as string)).toBeDefined(),
      );

      const everything = JSON.stringify(f.logs);
      expect(everything).not.toContain(token);
      expect(everything).not.toContain('Bearer');
      expect(everything).not.toContain('SESSION-SECRET-123');
      expect(everything).not.toContain('QUERY-SECRET-456');
      expect(everything).not.toContain('hunter2-ABC');
      expect(everything).not.toContain('KEY-SECRET-1');
      expect(everything).not.toContain('BODY-SECRET-789');
    });
  });
});
