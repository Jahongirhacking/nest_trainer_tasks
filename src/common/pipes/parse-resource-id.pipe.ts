import { Injectable, type ArgumentMetadata, type PipeTransform } from '@nestjs/common';

/**
 * Validates a resource id route parameter and returns it as a number.
 *
 * The ids of this application are POSITIVE INTEGERS (serial primary keys).
 * Rules (checked by parse-resource-id.pipe.spec.ts):
 *  - "42" -> 42
 *  - anything else -> `BadRequestException`: "", "  ", "0", "-1", "1.5",
 *    "1e3", "0x10", "abc", "12abc", ids beyond `Number.MAX_SAFE_INTEGER`,
 *    and non-string input (arrays, objects, undefined)
 *  - the message names the parameter (`metadata.data`) so the client knows what
 *    failed; the API error envelope comes from the global exception filter
 *
 * There is already `ParsePositiveIntPipe` (src/common/pipes) from Task 4.
 *
 * TODO: Implement `transform()`. Decide how this pipe relates to
 *       `ParsePositiveIntPipe` (reuse, extend, replace) and defend the choice
 *       in your notes. Do not copy-paste its logic.
 */
@Injectable()
export class ParseResourceIdPipe implements PipeTransform<unknown, number> {
  transform(_value: unknown, _metadata: ArgumentMetadata): number {
    throw new Error('Not implemented');
  }
}
