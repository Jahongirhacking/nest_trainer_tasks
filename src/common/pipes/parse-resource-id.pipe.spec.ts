import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { ParseResourceIdPipe } from './parse-resource-id.pipe.js';

/** Module C: the id of a resource is a positive integer. */
describe('ParseResourceIdPipe', () => {
  const pipe = new ParseResourceIdPipe();
  const metadata: ArgumentMetadata = { type: 'param', data: 'id' };
  const run = (value: unknown) => pipe.transform(value, metadata);

  it.each([
    ['1', 1],
    ['42', 42],
    ['9007199254740991', Number.MAX_SAFE_INTEGER],
  ])('accepts "%s" and returns the NUMBER %s', (raw, expected) => {
    const result = run(raw);
    expect(typeof result).toBe('number');
    expect(result).toBe(expected);
  });

  it.each([
    ['an empty string', ''],
    ['whitespace', '   '],
    ['zero', '0'],
    ['a negative number', '-1'],
    ['a decimal', '1.5'],
    ['exponent notation', '1e3'],
    ['hexadecimal', '0x10'],
    ['a word', 'abc'],
    ['digits followed by letters', '12abc'],
    ['a plus sign', '+5'],
    ['an id with spaces around', ' 5 '],
    ['an SQL injection attempt', '1 OR 1=1'],
    ['an id beyond MAX_SAFE_INTEGER', '9007199254740992'],
    ['a huge id', '99999999999999999999999'],
  ])('rejects %s with a BadRequestException', (_name, raw) => {
    expect(() => run(raw)).toThrow(BadRequestException);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an array', ['1']],
    ['an object', { id: 1 }],
    ['a number (the param is always a string)', 1],
  ])('rejects non-string input: %s', (_name, value) => {
    expect(() => run(value)).toThrow(BadRequestException);
  });

  it('answers 400 and names the parameter in the message', () => {
    try {
      run('abc');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const exception = error as BadRequestException;
      expect(exception.getStatus()).toBe(400);
      expect(exception.message).toMatch(/id/i);
    }
  });
});
