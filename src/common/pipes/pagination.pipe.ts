import { Inject, Injectable, type PipeTransform } from '@nestjs/common';
import type { RequestProcessingConfig } from '../interfaces/request-processing-config.interface.js';
import { REQUEST_PROCESSING_CONFIG } from '../tokens/request-processing.tokens.js';

/** Result of the pagination pipe. */
export interface Pagination {
  /** 1-based page number. */
  page: number;
  /** Items per page. */
  limit: number;
}

/** Page size used when the client sends no `limit`. */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

/**
 * Transforms the query string of a list endpoint (`?page=2&limit=10`) into a
 * `Pagination`.
 *
 * Rules (checked by pagination.pipe.spec.ts):
 *  - missing `page` -> DEFAULT_PAGE, missing `limit` -> DEFAULT_LIMIT
 *    (but never more than `config.maxPageSize`)
 *  - "2" -> 2: only plain decimal digit strings are numbers
 *  - invalid -> `BadRequestException`: "", "abc", "0", "-1", "1.5", "1e1",
 *    repeated parameters (`?page=1&page=2` arrives as an array), numbers
 *    beyond `Number.MAX_SAFE_INTEGER`
 *  - `limit` greater than `config.maxPageSize` is REJECTED (400), not clamped;
 *    `limit === maxPageSize` is fine
 *  - the result has exactly `page` and `limit`; other query keys are ignored
 *
 * The maximum comes from the injected config, never from a constant.
 *
 * TODO: Implement `transform()`. Be ready to explain why this is a pipe and
 *       not a DTO with class-validator.
 */
@Injectable()
export class PaginationPipe
  implements PipeTransform<Record<string, unknown>, Pagination>
{
  constructor(
    @Inject(REQUEST_PROCESSING_CONFIG)
    private readonly config: RequestProcessingConfig,
  ) {}

  transform(_query: Record<string, unknown>): Pagination {
    void this.config;
    throw new Error('Not implemented');
  }
}
