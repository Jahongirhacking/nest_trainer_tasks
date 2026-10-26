import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const numVal = Number(value);
    if (
      isNaN(numVal) ||
      typeof numVal !== 'number' ||
      numVal <= 0 ||
      Math.floor(numVal) !== numVal
    )
      throw new BadRequestException('Validation failed');
    return numVal;
  }
}
