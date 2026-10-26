import { invalidFields } from '../../../test/helpers/validate-dto.js';
import { UpdateTaskDto } from './update-task.dto.js';

const validate = (payload: unknown) => invalidFields(UpdateTaskDto, payload);
const repeat = (n: number) => 'a'.repeat(n);

/**
 * NOTE: rejecting an EMPTY object `{}` is deliberately NOT tested here. Where
 * you enforce it (DTO-level custom validation, pipe, controller, service) is
 * your design decision, so it is verified at the HTTP level in
 * test/task2/validation.e2e-spec.ts instead.
 */
describe('[Task 2] UpdateTaskDto validation', () => {
  describe('single valid properties', () => {
    it.each([
      ['title only', { title: 'New title' }],
      ['description only', { description: 'New description' }],
      ['completed: true only', { completed: true }],
      ['completed: false only', { completed: false }],
    ])('accepts %s', async (_label, payload) => {
      expect(await validate(payload)).toEqual([]);
    });
  });

  it('accepts several valid properties together', async () => {
    expect(
      await validate({ title: 'New title', description: 'd', completed: true }),
    ).toEqual([]);
  });

  describe('title (same rules as creation)', () => {
    it.each([repeat(3), repeat(100), '  abc  ', ` ${repeat(100)} `])(
      'accepts a valid title (length %#)',
      async (title) => {
        expect(await validate({ title })).toEqual([]);
      },
    );

    it.each([
      ['null', null],
      ['a number', 5],
      ['a boolean', true],
      ['an array', ['abc']],
      ['an empty string', ''],
      ['spaces only', '    '],
      ['2 characters', repeat(2)],
      ['2 characters after trimming', ' ab '],
      ['101 characters', repeat(101)],
    ])('rejects a title that is %s', async (_label, title) => {
      expect(await validate({ title })).toContain('title');
    });
  });

  describe('description (same rules as creation)', () => {
    it('accepts a 500 character description', async () => {
      expect(await validate({ description: repeat(500) })).toEqual([]);
    });

    it.each([
      ['null', null],
      ['a number', 5],
      ['a boolean', true],
      ['501 characters', repeat(501)],
    ])('rejects a description that is %s', async (_label, description) => {
      expect(await validate({ description })).toContain('description');
    });
  });

  describe('completed', () => {
    it.each([
      ['null', null],
      ['the string "true"', 'true'],
      ['the string "false"', 'false'],
      ['the number 1', 1],
      ['the number 0', 0],
      ['an array', []],
      ['an object', {}],
    ])('rejects completed that is %s', async (_label, completed) => {
      expect(await validate({ completed })).toContain('completed');
    });
  });

  describe('protected and unknown properties', () => {
    it.each([
      ['id', { id: 1 }],
      ['createdAt', { createdAt: '2025-01-01T00:00:00.000Z' }],
      ['an unknown property', { priority: 'high' }],
    ])('rejects %s even next to a valid property', async (_label, extra) => {
      const failed = await validate({ completed: true, ...extra });
      expect(failed).toContain(Object.keys(extra)[0]);
    });
  });
});
