import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { RequestLogger } from '../interfaces/request-log.interface.js';
import type { RequestProcessingConfig } from '../interfaces/request-processing-config.interface.js';
import {
  REQUEST_LOGGER,
  REQUEST_PROCESSING_CONFIG,
} from '../tokens/request-processing.tokens.js';

/**
 * Runs first for every request (before guards, interceptors and pipes).
 *
 * Contract (checked by request-logging.middleware.spec.ts):
 *  - a NEW unique request id per request, generated here, never copied from
 *    the client; attached to the request as `req.requestMetadata` and sent in
 *    the response header named by `config.requestIdHeader`
 *  - `RequestMetadataInfo` = { requestId, startedAt, clientIp, userAgent }
 *  - log `request.started` right away and `request.completed` when the
 *    response is finished, through the injected `RequestLogger`
 *  - nothing is logged when `config.requestLoggingEnabled` is false (the id
 *    and the header still work)
 *  - no secrets in the entries (ASSIGNMENT.md, "Sensitive data")
 *  - no business logic, no database access
 *
 * TODO: Implement `use()`. It must call `next()` exactly once.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(
    @Inject(REQUEST_PROCESSING_CONFIG)
    private readonly config: RequestProcessingConfig,
    @Inject(REQUEST_LOGGER) private readonly logger: RequestLogger,
  ) {}

  use(_req: Request, _res: Response, _next: NextFunction): void {
    // TODO: Generate the request id.
    // TODO: Build the RequestMetadataInfo and attach it to the request.
    // TODO: Set the response header.
    // TODO: Log `request.started` (if enabled).
    // TODO: Log `request.completed` when the response finishes (if enabled).
    // TODO: Call next().
    throw new Error('Not implemented');
  }
}
