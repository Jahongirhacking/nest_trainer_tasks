import {
  HttpException,
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { tap, type Observable } from 'rxjs';
import type { RequestLogger } from '../interfaces/request-log.interface.js';
import type { RequestProcessingConfig } from '../interfaces/request-processing-config.interface.js';
import {
  REQUEST_LOGGER,
  REQUEST_METADATA_PROPERTY,
  REQUEST_PROCESSING_CONFIG,
  SKIP_REQUEST_TIMING_KEY,
  UNKNOWN_REQUEST_ID,
} from '../tokens/request-processing.tokens.js';
import { sanitizeUrl } from '../utils/sanitizeUrl.js';

/**
 * Measures how long the handler path takes and logs ONE `request.timing` entry
 * per request.
 *
 * Contract (checked by request-timing.interceptor.spec.ts and the HTTP spec):
 *  - the stream the caller receives is the handler's stream: same value (the
 *    very same object), same error (the very same instance), nothing added
 *  - success -> outcome "success", statusCode of the response
 *  - error -> outcome "error", statusCode = the HttpException's status, or 500
 *    for any other error; the error is rethrown unchanged
 *  - exactly one entry per request, success or failure
 *  - `requestId`, `method`, `url` come from the request (`req.requestMetadata`
 *    is set by the middleware; `UNKNOWN_REQUEST_ID` when it is missing)
 *  - nothing is logged when `config.timingLogsEnabled` is false or the route is
 *    marked with `@SkipRequestTiming()` (ASSIGNMENT.md, "Module F")
 *  - works for async handlers; no database access
 *
 * Constructor parameters are part of the contract: the unit tests call
 * `new RequestTimingInterceptor(reflector, config, logger)`.
 *
 * TODO: Implement `intercept()`. You choose the RxJS operators; be ready to
 *       explain `tap` vs `map` vs `finalize` vs `catchError`.
 */
@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REQUEST_PROCESSING_CONFIG)
    private readonly config: RequestProcessingConfig,
    @Inject(REQUEST_LOGGER) private readonly logger: RequestLogger,
  ) {}

  intercept(
    _context: ExecutionContext,
    _next: CallHandler,
  ): Observable<unknown> {
    // TODO: Decide whether this request is timed at all (config + metadata).
    // TODO: Capture the start time.
    // TODO: Run the handler and measure for success AND error paths.
    // TODO: Log exactly one `request.timing` entry; do not touch the response.
    if (!this.config.timingLogsEnabled) return _next.handle();
    const skipRequestTiming = this.reflector.getAllAndOverride(
      SKIP_REQUEST_TIMING_KEY,
      [_context.getHandler(), _context.getClass()],
    );
    if (skipRequestTiming) return _next.handle();

    const startTime = new Date();
    const ctx = _context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    let logged = false;

    const log = (statusCode: number, outcome: 'success' | 'error') => {
      if (logged) return; // exactly one entry
      logged = true;
      this.logger.log({
        event: 'request.timing',
        requestId:
          req[REQUEST_METADATA_PROPERTY]?.requestId ?? UNKNOWN_REQUEST_ID,
        method: req.method,
        url: sanitizeUrl(req.originalUrl || req.url),
        statusCode,
        durationMs: Number(Date.now()) - Number(startTime),
        outcome,
      });
    };

    return _next.handle().pipe(
      tap({
        next: () => log(res.statusCode, 'success'),
        error: (err: unknown) =>
          log(err instanceof HttpException ? err.getStatus() : 500, 'error'),
      }),
    );
  }
}
