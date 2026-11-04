import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<unknown, number> {
  transform(value: unknown): number {
    if (typeof value !== 'string' || !/^\d+$/.test(value))
      throw new BadRequestException('Validation failed');
    const numVal = Number(value);
    if (!Number.isSafeInteger(numVal) || numVal <= 0)
      throw new BadRequestException('Validation failed');
    return numVal;
  }
}
