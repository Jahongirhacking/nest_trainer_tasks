import { invalidFields } from '../../../test/helpers/validate-dto.js';
import { LoginDto } from './login.dto.js';

const validate = (payload: unknown) => invalidFields(LoginDto, payload);
const good = { email: 'dev@example.com', password: 'whatever it was' };

describe('[Task 4] LoginDto validation', () => {
  it('accepts an email and a password', async () => {
    expect(await validate(good)).toEqual([]);
  });

  it('accepts an email with different case / surrounding whitespace', async () => {
    expect(await validate({ ...good, email: '  DEV@Example.com ' })).toEqual(
      [],
    );
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['a number', 5],
    ['an array', ['a@b.co']],
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['not an email', 'nope'],
  ])('rejects an email that is %s', async (_label, email) => {
    const payload =
      email === undefined ? { password: good.password } : { ...good, email };
    expect(await validate(payload)).toContain('email');
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['a number', 5],
    ['an array', ['x']],
    ['an empty string', ''],
  ])('rejects a password that is %s', async (_label, password) => {
    const payload =
      password === undefined ? { email: good.email } : { ...good, password };
    expect(await validate(payload)).toContain('password');
  });

  it('does not enforce the registration length policy at login', async () => {
    expect(await validate({ ...good, password: 'short' })).toEqual([]);
  });

  it.each(['id', 'passwordHash', 'role', 'unknown'])(
    'rejects the unexpected property "%s"',
    async (key) => {
      expect(await validate({ ...good, [key]: 1 })).toContain(key);
    },
  );
});
