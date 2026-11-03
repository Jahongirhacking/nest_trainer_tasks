import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RequestMetadataInfo } from '../interfaces/request-metadata.interface.js';

/**
 * Parameter decorator that gives a controller the request metadata without
 * touching the Express request:
 *
 *   @RequestMetadata()            -> the whole RequestMetadataInfo
 *   @RequestMetadata('requestId') -> one property of it
 *
 * Rules (checked by request-metadata.decorator.spec.ts):
 *  - reads ONLY what the middleware stored under `REQUEST_METADATA_PROPERTY`;
 *    it never reads headers, the user or the body
 *  - when no metadata is on the request (middleware not applied) it returns
 *    `undefined` instead of throwing
 *  - reuse `@CurrentUser()` (src/rbac/decorators) for the authenticated user
 *
 * SCAFFOLDING: the factory below returns nothing.
 *
 * TODO: Implement the factory with `ExecutionContext#switchToHttp()`.
 */
export const RequestMetadata = createParamDecorator(
  (
    _property: keyof RequestMetadataInfo | undefined,
    _context: ExecutionContext,
  ): RequestMetadataInfo | RequestMetadataInfo[keyof RequestMetadataInfo] | undefined => {
    // TODO: Implement.
    return undefined;
  },
);
