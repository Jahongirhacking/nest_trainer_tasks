import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const numVal = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(numVal) || numVal <= 0)
      throw new BadRequestException('Validation failed');
    return numVal;
  }
}
