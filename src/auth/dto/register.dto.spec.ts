import { invalidFields } from '../../../test/helpers/validate-dto.js';
import { RegisterDto } from './register.dto.js';

const validate = (payload: unknown) => invalidFields(RegisterDto, payload);
const good = { email: 'dev@example.com', password: 'a'.repeat(12) };

describe('[Task 4] RegisterDto validation', () => {
  describe('accepts', () => {
    it.each([
      ['a plain valid body', good],
      [
        'an email padded with whitespace',
        { ...good, email: '  Dev@Example.COM  ' },
      ],
      [
        'a 12 character password (minimum)',
        { ...good, password: 'a'.repeat(12) },
      ],
      [
        'a 128 character password (maximum)',
        { ...good, password: 'a'.repeat(128) },
      ],
      [
        'a password with surrounding spaces',
        { ...good, password: '  twelve chars+  ' },
      ],
      [
        'a passphrase without digits or symbols',
        { ...good, password: 'only lowercase letters here' },
      ],
    ])('%s', async (_label, payload) => {
      expect(await validate(payload)).toEqual([]);
    });
  });

  describe('email', () => {
    it.each([
      ['missing', undefined],
      ['null', null],
      ['a number', 5],
      ['an array', ['a@b.co']],
      ['an empty string', ''],
      ['whitespace only', '   '],
      ['not an email', 'not-an-email'],
      ['missing the domain', 'user@'],
    ])('rejects an email that is %s', async (_label, email) => {
      const payload =
        email === undefined ? { password: good.password } : { ...good, email };
      expect(await validate(payload)).toContain('email');
    });
  });

  describe('password', () => {
    it.each([
      ['missing', undefined],
      ['null', null],
      ['a number', 123456789012],
      ['an array', ['a'.repeat(12)]],
      ['an empty string', ''],
      ['whitespace only (12 spaces)', ' '.repeat(12)],
      ['11 characters', 'a'.repeat(11)],
      ['129 characters', 'a'.repeat(129)],
    ])('rejects a password that is %s', async (_label, password) => {
      const payload =
        password === undefined ? { email: good.email } : { ...good, password };
      expect(await validate(payload)).toContain('password');
    });
  });

  it.each([
    'id',
    'passwordHash',
    'createdAt',
    'updatedAt',
    'role',
    'roles',
    'unknown',
  ])('rejects the unexpected property "%s"', async (key) => {
    expect(await validate({ ...good, [key]: 1 })).toContain(key);
  });
});
