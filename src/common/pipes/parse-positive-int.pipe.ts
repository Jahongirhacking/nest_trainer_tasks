import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { checkSafeInt } from '../utils/checkSafeInt.js';

@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<unknown, number> {
  transform(value: unknown): number {
    try {
      return checkSafeInt(value);
    } catch {
      throw new BadRequestException();
    }
  }
}
