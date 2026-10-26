import { invalidFields } from '../../../test/helpers/validate-dto.js';
import { CreateTaskDto } from './create-task.dto.js';

const validate = (payload: unknown) => invalidFields(CreateTaskDto, payload);
const repeat = (n: number) => 'a'.repeat(n);

describe('[Task 2] CreateTaskDto validation', () => {
  describe('title', () => {
    it.each([
      ['3 characters (minimum)', repeat(3)],
      ['100 characters (maximum)', repeat(100)],
      ['padded with whitespace (3 after trimming)', '  abc  '],
      ['100 characters plus surrounding whitespace', ` ${repeat(100)} `],
      ['a normal sentence', 'Learn NestJS validation'],
    ])('accepts %s', async (_label, title) => {
      expect(await validate({ title })).toEqual([]);
    });

    it.each([
      ['missing', undefined],
      ['null', null],
      ['a number', 123],
      ['a boolean', true],
      ['an array', ['abc']],
      ['an object', { value: 'abc' }],
      ['an empty string', ''],
      ['spaces only', '     '],
      ['tabs and newlines only', '\t\n \r\n'],
      ['2 characters', repeat(2)],
      ['2 characters after trimming', '  ab  '],
      ['101 characters', repeat(101)],
      ['101 characters after trimming', ` ${repeat(101)} `],
    ])('rejects a title that is %s', async (_label, title) => {
      const payload = title === undefined ? {} : { title };
      expect(await validate(payload)).toContain('title');
    });
  });

  describe('description', () => {
    it.each([
      ['missing', undefined],
      ['a short string', 'Some details'],
      ['1 character', 'x'],
      ['500 characters (maximum)', repeat(500)],
    ])('accepts a description that is %s', async (_label, description) => {
      const payload =
        description === undefined
          ? { title: 'Valid title' }
          : { title: 'Valid title', description };
      expect(await validate(payload)).toEqual([]);
    });

    it.each([
      ['null', null],
      ['a number', 42],
      ['a boolean', false],
      ['an array', ['text']],
      ['an object', { text: 'x' }],
      ['501 characters', repeat(501)],
    ])('rejects a description that is %s', async (_label, description) => {
      expect(await validate({ title: 'Valid title', description })).toContain(
        'description',
      );
    });
  });

  describe('server-controlled and unknown properties', () => {
    it.each([
      ['id', { id: 1 }],
      ['createdAt', { createdAt: '2025-01-01T00:00:00.000Z' }],
      ['completed (true)', { completed: true }],
      ['completed (false)', { completed: false }],
      ['an unknown property', { priority: 'high' }],
    ])('rejects %s', async (_label, extra) => {
      const failed = await validate({ title: 'Valid title', ...extra });
      expect(failed).toContain(Object.keys(extra)[0]);
    });

    it('reports every invalid property, not just the first one', async () => {
      const failed = await validate({ title: 'x', description: 5, extra: 1 });
      expect(failed).toEqual(
        expect.arrayContaining(['title', 'description', 'extra']),
      );
    });
  });

  it('accepts a fully valid payload', async () => {
    expect(
      await validate({ title: 'Learn NestJS', description: 'Validation' }),
    ).toEqual([]);
  });
});
