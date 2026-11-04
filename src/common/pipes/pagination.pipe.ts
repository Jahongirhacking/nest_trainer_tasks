import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
  type PipeTransform,
} from '@nestjs/common';
import type { RequestProcessingConfig } from '../interfaces/request-processing-config.interface.js';
import { REQUEST_PROCESSING_CONFIG } from '../tokens/request-processing.tokens.js';
import { ParsePositiveIntPipe } from './parse-positive-int.pipe.js';

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
export class PaginationPipe implements PipeTransform<
  Record<string, unknown>,
  Pagination
> {
  constructor(
    @Inject(REQUEST_PROCESSING_CONFIG)
    private readonly config: RequestProcessingConfig,
    @Optional()
    private readonly parsePositiveIntPipe: ParsePositiveIntPipe = new ParsePositiveIntPipe(),
  ) {}

  transform(query: Record<string, unknown>): Pagination {
    const { maxPageSize } = this.config;
    const page = this.parse('page', query['page'], DEFAULT_PAGE);
    const limit = this.parse(
      'limit',
      query['limit'],
      Math.min(DEFAULT_LIMIT, maxPageSize),
    );
    if (limit > maxPageSize)
      throw new BadRequestException(
        `"limit" must not be greater than MAX_PAGE_SIZE ${maxPageSize}`,
      );
    return { page, limit };
  }

  private parse(name: string, raw: unknown, fallback: number): number {
    if (raw === undefined) return fallback;
    try {
      return this.parsePositiveIntPipe.transform(raw);
    } catch {
      throw new BadRequestException(`"${name}" must be a positive integer`);
    }
  }
}
