import { invalidFields } from '../../../test/helpers/validate-dto.js';
import { CreateProjectDto } from './create-project.dto.js';

const validate = (payload: unknown) => invalidFields(CreateProjectDto, payload);
const repeat = (n: number) => 'a'.repeat(n);

describe('[Task 3] CreateProjectDto validation', () => {
  describe('name', () => {
    it.each([
      ['1 character', 'a'],
      ['100 characters (maximum)', repeat(100)],
      ['padded with whitespace', '  Backend  '],
      ['100 characters plus surrounding whitespace', ` ${repeat(100)} `],
    ])('accepts %s', async (_label, name) => {
      expect(await validate({ name })).toEqual([]);
    });

    it.each([
      ['missing', undefined],
      ['null', null],
      ['a number', 123],
      ['an array', ['abc']],
      ['an empty string', ''],
      ['spaces only', '     '],
      ['tabs and newlines only', '\t\n \r\n'],
      ['101 characters', repeat(101)],
      ['101 characters after trimming', ` ${repeat(101)} `],
    ])('rejects a name that is %s', async (_label, name) => {
      const payload = name === undefined ? {} : { name };
      expect(await validate(payload)).toContain('name');
    });
  });

  describe('description', () => {
    it.each([
      ['omitted', undefined],
      ['an empty string', ''],
      ['500 characters (maximum)', repeat(500)],
    ])('accepts a description that is %s', async (_label, description) => {
      const payload =
        description === undefined ? { name: 'P' } : { name: 'P', description };
      expect(await validate(payload)).toEqual([]);
    });

    it.each([
      ['501 characters', repeat(501)],
      ['a number', 5],
      ['an array', ['x']],
    ])('rejects a description that is %s', async (_label, description) => {
      expect(await validate({ name: 'P', description })).toContain('description');
    });
  });

  it.each(['id', 'createdAt', 'updatedAt', 'tasks', 'unknown'])(
    'rejects the unexpected property "%s"',
    async (key) => {
      expect(await validate({ name: 'P', [key]: 1 })).toContain(key);
    },
  );
});
