import type { MediaCategory } from '../enums/media-category.enum.js';

/**
 * Query string of `GET /media`: `?category=IMAGE&page=1&limit=10`.
 *
 * TODO: Add the validation decorators. `category` is optional and must be a
 *       real `MediaCategory`.
 * TODO: Task 6 already has `PaginationPipe` (src/common/pipes). The global
 *       ValidationPipe uses `forbidNonWhitelisted`: a DTO that does not declare
 *       `page` / `limit` rejects them. Decide how the two work together
 *       (declare them in the DTO, or split the query parameters) and note why.
 */
export class QueryMediaDto {
  category?: MediaCategory;
}
