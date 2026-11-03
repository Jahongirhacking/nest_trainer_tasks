import {
  type CallHandler,
  type ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { defer, delay, lastValueFrom, type Observable, of, switchMap, throwError, timer } from 'rxjs';
import { httpContext } from '../../../test/helpers/http-execution-context.js';
import { SkipRequestTiming } from '../decorators/skip-request-timing.decorator.js';
import type {
  RequestLogEntry,
  RequestTimingEntry,
} from '../interfaces/request-log.interface.js';
import type { RequestProcessingConfig } from '../interfaces/request-processing-config.interface.js';
import {
  REQUEST_METADATA_PROPERTY,
  UNKNOWN_REQUEST_ID,
} from '../tokens/request-processing.tokens.js';
import { RequestTimingInterceptor } from './request-timing.interceptor.js';

/**
 * Module B and F. The clock is FAKED (Date, performance and hrtime), so no
 * assertion depends on real elapsed time: a handler that "takes" 100 ms
 * finishes the moment the test advances the fake clock by 100 ms.
 */

@SkipRequestTiming()
class SkippingController {
  skipped() {}

  @SkipRequestTiming(false)
  timedAgain() {}
}

class MixedController {
  timed() {}

  @SkipRequestTiming()
  skipped() {}

  @SkipRequestTiming(false)
  explicitlyTimed() {}
}

const CONFIG: RequestProcessingConfig = {
  requestLoggingEnabled: true,
  timingLogsEnabled: true,
  maxPageSize: 50,
  requestIdHeader: 'x-request-id',
  environment: 'test',
};

describe('RequestTimingInterceptor', () => {
  let entries: RequestLogEntry[];

  beforeEach(() => {
    vi.useFakeTimers();
    entries = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const build = (config: Partial<RequestProcessingConfig> = {}) =>
    new RequestTimingInterceptor(
      new Reflector(),
      { ...CONFIG, ...config },
      { log: (entry) => entries.push(entry) },
    );

  const requestWith = (requestId?: string) => ({
    method: 'GET',
    originalUrl: '/tasks?page=2',
    url: '/tasks?page=2',
    ...(requestId && {
      [REQUEST_METADATA_PROPERTY]: {
        requestId,
        startedAt: new Date(),
        clientIp: '127.0.0.1',
        userAgent: 'spec',
      },
    }),
  });

  const ctx = (
    controller: new () => object = MixedController,
    handler = 'timed',
    request: object = requestWith('req-1'),
    response: object = { statusCode: 200 },
  ): ExecutionContext =>
    httpContext(controller as never, handler as never, request, response);

  /** Runs the interceptor and advances the fake clock by `ms`. */
  async function run(
    interceptor: RequestTimingInterceptor,
    context: ExecutionContext,
    stream: Observable<unknown>,
    ms = 0,
  ) {
    const handle = vi.fn(() => stream);
    const next: CallHandler = { handle };
    const settled = lastValueFrom(interceptor.intercept(context, next)).then(
      (value) => ({ value, error: undefined as unknown }),
      (error: unknown) => ({ value: undefined, error }),
    );
    await vi.advanceTimersByTimeAsync(ms);
    return { ...(await settled), handle };
  }

  const timing = () =>
    entries.filter((e): e is RequestTimingEntry => e.event === 'request.timing');

  describe('successful requests', () => {
    it('logs one "success" entry with the measured duration', async () => {
      const body = { id: 1 };
      await run(build(), ctx(), of(body).pipe(delay(100)), 100);
      expect(timing()).toHaveLength(1);
      expect(entries).toHaveLength(1);
      const [entry] = timing();
      expect(entry.outcome).toBe('success');
      expect(entry.statusCode).toBe(200);
      expect(Number.isFinite(entry.durationMs)).toBe(true);
      expect(entry.durationMs).toBeGreaterThanOrEqual(100);
    });

    it('measures the handler, so a slower handler gets a longer duration', async () => {
      await run(build(), ctx(), of(1).pipe(delay(20)), 20);
      await run(build(), ctx(), of(1).pipe(delay(400)), 400);
      const [fast, slow] = timing();
      expect(slow.durationMs).toBeGreaterThan(fast.durationMs);
    });

    it('reports who and what was timed (taken from the request)', async () => {
      await run(build(), ctx(), of(1));
      expect(timing()[0]).toMatchObject({
        event: 'request.timing',
        requestId: 'req-1',
        method: 'GET',
      });
      expect(timing()[0].url).toContain('/tasks');
    });

    it('uses the status code of the response', async () => {
      await run(build(), ctx(MixedController, 'timed', requestWith('r'), { statusCode: 201 }), of(1));
      expect(timing()[0].statusCode).toBe(201);
    });

    it('works with an async handler (a stream that resolves later)', async () => {
      const promise = new Promise((resolve) => setTimeout(() => resolve('late'), 50));
      const { value } = await run(build(), ctx(), defer(() => promise), 50);
      expect(value).toBe('late');
      expect(timing()[0].durationMs).toBeGreaterThanOrEqual(50);
    });

    it('does not break when the middleware did not run (no metadata)', async () => {
      await run(build(), ctx(MixedController, 'timed', requestWith(undefined)), of(1));
      expect(timing()[0].requestId).toBe(UNKNOWN_REQUEST_ID);
    });
  });

  describe('the response is not touched', () => {
    it('returns the very same value the handler produced', async () => {
      const body = { id: 1, nested: { ok: true } };
      const { value, handle } = await run(build(), ctx(), of(body));
      expect(value).toBe(body);
      expect(handle).toHaveBeenCalledTimes(1);
    });

    it('subscribes to the handler exactly once', async () => {
      let subscriptions = 0;
      await run(
        build(),
        ctx(),
        defer(() => {
          subscriptions += 1;
          return of(1);
        }),
      );
      expect(subscriptions).toBe(1);
    });

    it('passes `undefined` and `null` bodies through', async () => {
      expect((await run(build(), ctx(), of(undefined))).value).toBeUndefined();
      expect((await run(build(), ctx(), of(null))).value).toBeNull();
    });
  });

  describe('failed requests', () => {
    it('logs one "error" entry with the exception status and rethrows the same error', async () => {
      const failure = new NotFoundException('Task 9 not found');
      const { error } = await run(
        build(),
        ctx(),
        // `delay()` does not delay errors, a timer does
        timer(30).pipe(switchMap(() => throwError(() => failure))),
        30,
      );
      expect(error).toBe(failure);
      expect(entries).toHaveLength(1);
      expect(timing()[0]).toMatchObject({ outcome: 'error', statusCode: 404 });
      expect(timing()[0].durationMs).toBeGreaterThanOrEqual(30);
    });

    it('reports 500 for an error that is not an HttpException', async () => {
      const failure = new TypeError('boom');
      const { error } = await run(build(), ctx(), throwError(() => failure));
      expect(error).toBe(failure);
      expect(timing()[0]).toMatchObject({ outcome: 'error', statusCode: 500 });
    });

    it('does not turn an error into a value or a value into an error', async () => {
      const ok = await run(build(), ctx(), of('fine'));
      expect(ok.error).toBeUndefined();
      const bad = await run(build(), ctx(), throwError(() => new Error('x')));
      expect(bad.value).toBeUndefined();
      expect(bad.error).toBeInstanceOf(Error);
    });
  });

  describe('exactly one entry per request (cleanup on both paths)', () => {
    it('logs once on success, even with several emissions', async () => {
      await run(build(), ctx(), of(1, 2, 3));
      expect(timing()).toHaveLength(1);
    });

    it('logs once on error', async () => {
      await run(build(), ctx(), throwError(() => new Error('x')));
      expect(timing()).toHaveLength(1);
    });

    it('logs once per request when requests overlap', async () => {
      const interceptor = build();
      await Promise.all([
        run(interceptor, ctx(MixedController, 'timed', requestWith('a')), of(1).pipe(delay(10)), 10),
        run(interceptor, ctx(MixedController, 'timed', requestWith('b')), of(2).pipe(delay(10)), 10),
      ]);
      expect(timing().map((e) => e.requestId).sort()).toEqual(['a', 'b']);
    });
  });

  describe('configuration', () => {
    it('logs nothing when timing logs are disabled, but still runs the handler', async () => {
      const body = { ok: true };
      const { value, handle } = await run(
        build({ timingLogsEnabled: false }),
        ctx(),
        of(body),
      );
      expect(entries).toEqual([]);
      expect(value).toBe(body);
      expect(handle).toHaveBeenCalledTimes(1);
    });

    it('logs nothing for a failing request either when disabled', async () => {
      const { error } = await run(
        build({ timingLogsEnabled: false }),
        ctx(),
        throwError(() => new NotFoundException()),
      );
      expect(error).toBeInstanceOf(NotFoundException);
      expect(entries).toEqual([]);
    });
  });

  describe('@SkipRequestTiming() (metadata-driven behaviour)', () => {
    const skippedValue = { still: 'returned' };

    it('skips a route marked at method level', async () => {
      const { value, handle } = await run(
        build(),
        ctx(MixedController, 'skipped'),
        of(skippedValue),
      );
      expect(entries).toEqual([]);
      expect(value).toBe(skippedValue);
      expect(handle).toHaveBeenCalledTimes(1);
    });

    it('skips every route of a controller marked at class level', async () => {
      await run(build(), ctx(SkippingController, 'skipped'), of(1));
      expect(entries).toEqual([]);
    });

    it('also skips failing requests', async () => {
      const { error } = await run(
        build(),
        ctx(MixedController, 'skipped'),
        throwError(() => new NotFoundException()),
      );
      expect(error).toBeInstanceOf(NotFoundException);
      expect(entries).toEqual([]);
    });

    it('times a route that has no metadata at all (the default is ON)', async () => {
      await run(build(), ctx(MixedController, 'timed'), of(1));
      expect(timing()).toHaveLength(1);
    });

    it('lets a method re-enable timing in a controller that skips it', async () => {
      await run(build(), ctx(SkippingController, 'timedAgain'), of(1));
      expect(timing()).toHaveLength(1);
    });

    it('treats an explicit `false` on a method like no skip', async () => {
      await run(build(), ctx(MixedController, 'explicitlyTimed'), of(1));
      expect(timing()).toHaveLength(1);
    });
  });
});
