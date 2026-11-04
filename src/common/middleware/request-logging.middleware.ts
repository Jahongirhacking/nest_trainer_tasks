import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { RequestLogger } from '../interfaces/request-log.interface.js';
import { RequestMetadataInfo } from '../interfaces/request-metadata.interface.js';
import type { RequestProcessingConfig } from '../interfaces/request-processing-config.interface.js';
import {
  REQUEST_LOGGER,
  REQUEST_PROCESSING_CONFIG,
} from '../tokens/request-processing.tokens.js';
import { sanitizeUrl } from '../utils/sanitizeUrl.js';

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
    const startTime = new Date();

    const metadata: RequestMetadataInfo = {
      requestId: randomUUID(),
      clientIp: _req.ip,
      startedAt: new Date(),
      userAgent: _req.get('user-agent'),
    };

    _req.requestMetadata = metadata;
    _res.setHeader(this.config.requestIdHeader, metadata.requestId);

    const url = sanitizeUrl(_req.originalUrl ?? _req.url);

    if (this.config.requestLoggingEnabled) {
      this.logger.log({
        event: 'request.started',
        ...metadata,
        timestamp: metadata.startedAt.toISOString(),
        url,
        method: _req.method,
      });
    }

    _res.on('finish', () => {
      if (this.config.requestLoggingEnabled) {
        this.logger.log({
          event: 'request.completed',
          requestId: metadata.requestId,
          url,
          method: _req.method,
          statusCode: _res.statusCode,
          durationMs: Number(new Date()) - Number(startTime),
        });
      }
    });

    _next();
  }
}
