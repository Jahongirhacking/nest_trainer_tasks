import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import type { RequestLogger } from '../interfaces/request-log.interface.js';
import type { RequestProcessingConfig } from '../interfaces/request-processing-config.interface.js';
import {
  REQUEST_LOGGER,
  REQUEST_PROCESSING_CONFIG,
} from '../tokens/request-processing.tokens.js';

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
    throw new Error('Not implemented');
  }
}
