import type { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { App } from 'supertest/types.js';
import { expectApiError } from './helpers/api-error.js';
import { createTestApp, http, resetDatabase } from './helpers/app.js';
import {
  bearer,
  countUsers,
  expectNoCredentials,
  findUserRow,
  loginUser,
  registerAndLogin,
  registerUser,
  uniqueEmail,
  VALID_PASSWORD,
} from './helpers/auth.js';
import {
  decodeJwtPayload,
  signTestJwt,
  TEST_JWT_AUDIENCE,
  TEST_JWT_ISSUER,
} from './helpers/jwt.js';

/**
 * Full authentication flow against the REAL application and the PostgreSQL
 * TEST database. Nothing is mocked: ValidationPipe, Passport, JWT and
 * TypeORM are all real.
 */
describe('Authentication API (e2e, PostgreSQL)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(app);
  });

  describe('POST /auth/register', () => {
    it('creates a user (201) and returns a safe representation', async () => {
      const email = uniqueEmail();
      const res = await http(app)
        .post('/auth/register')
        .send({ email, password: VALID_PASSWORD })
        .expect(201);
      expect(typeof res.body.id).toBe('number');
      expect(res.body.email).toBe(email);
      expectNoCredentials(res.body, VALID_PASSWORD);
    });

    it('persists a hash, never the plaintext password', async () => {
      const { email } = await registerUser(app);
      const row = await findUserRow(app, email);
      expect(row).toBeDefined();
      expect(row!.passwordHash).toBeTypeOf('string');
      expect(row!.passwordHash).not.toBe(VALID_PASSWORD);
      expect(JSON.stringify(row)).not.toContain(VALID_PASSWORD);
      expect(await argon2.verify(row!.passwordHash, VALID_PASSWORD)).toBe(true);
    });

    it('stores the email normalized (trimmed, lower case)', async () => {
      const res = await http(app)
        .post('/auth/register')
        .send({ email: '  Dev.Mixed@Example.COM  ', password: VALID_PASSWORD })
        .expect(201);
      expect(res.body.email).toBe('dev.mixed@example.com');
      expect(await findUserRow(app, 'dev.mixed@example.com')).toBeDefined();
    });

    it('rejects a duplicate email with 409 and stores only one user', async () => {
      const { email } = await registerUser(app);
      const res = await http(app)
        .post('/auth/register')
        .send({ email, password: VALID_PASSWORD });
      expectApiError(res, 409);
      expect(await countUsers(app)).toBe(1);
    });

    it('treats emails that differ only by case or whitespace as duplicates', async () => {
      const { email } = await registerUser(app);
      const res = await http(app)
        .post('/auth/register')
        .send({ email: `  ${email.toUpperCase()} `, password: VALID_PASSWORD });
      expectApiError(res, 409);
      expect(await countUsers(app)).toBe(1);
    });

    it('does not leak database details in the 409', async () => {
      const { email } = await registerUser(app);
      const res = await http(app)
        .post('/auth/register')
        .send({ email, password: VALID_PASSWORD });
      const raw = JSON.stringify(res.body);
      expect(raw).not.toMatch(
        /duplicate key|unique constraint|users_|UQ_|pg_|QueryFailed/i,
      );
      expect(raw).not.toMatch(/\n\s+at\s/);
    });

    it.each([
      ['missing email', { password: VALID_PASSWORD }, 'email'],
      ['invalid email', { email: 'nope', password: VALID_PASSWORD }, 'email'],
      ['numeric email', { email: 5, password: VALID_PASSWORD }, 'email'],
      ['missing password', { email: 'a@example.com' }, 'password'],
      [
        'short password (11)',
        { email: 'a@example.com', password: 'a'.repeat(11) },
        'password',
      ],
      [
        'long password (129)',
        { email: 'a@example.com', password: 'a'.repeat(129) },
        'password',
      ],
      [
        'numeric password',
        { email: 'a@example.com', password: 123456789012 },
        'password',
      ],
      [
        'whitespace-only password',
        { email: 'a@example.com', password: ' '.repeat(14) },
        'password',
      ],
      [
        'client-supplied id',
        { email: 'a@example.com', password: VALID_PASSWORD, id: 1 },
        'id',
      ],
      [
        'client-supplied passwordHash',
        { email: 'a@example.com', password: VALID_PASSWORD, passwordHash: 'x' },
        'passwordHash',
      ],
      [
        'client-supplied createdAt',
        {
          email: 'a@example.com',
          password: VALID_PASSWORD,
          createdAt: '2020-01-01',
        },
        'createdAt',
      ],
      [
        'client-supplied updatedAt',
        {
          email: 'a@example.com',
          password: VALID_PASSWORD,
          updatedAt: '2020-01-01',
        },
        'updatedAt',
      ],
      [
        'unknown property',
        { email: 'a@example.com', password: VALID_PASSWORD, admin: true },
        'admin',
      ],
    ])('returns 400 for %s and stores nothing', async (_label, body, field) => {
      const res = await http(app).post('/auth/register').send(body);
      const errors = expectApiError(res, 400, { fields: true });
      expect(errors.map((e) => e.field)).toContain(field);
      expect(await countUsers(app)).toBe(0);
    });

    it('accepts a 12 and a 128 character password', async () => {
      await http(app)
        .post('/auth/register')
        .send({ email: uniqueEmail(), password: 'a'.repeat(12) })
        .expect(201);
      await http(app)
        .post('/auth/register')
        .send({ email: uniqueEmail(), password: 'b'.repeat(128) })
        .expect(201);
    });
  });

  describe('POST /auth/login', () => {
    it('returns 200 and an access token for correct credentials', async () => {
      const { email, password } = await registerUser(app);
      const res = await http(app)
        .post('/auth/login')
        .send({ email, password })
        .expect(200);
      expect(res.body.accessToken).toBeTypeOf('string');
      expect(res.body.accessToken.split('.')).toHaveLength(3);
      expectNoCredentials(res.body, password);
    });

    it('accepts the email with different case and surrounding whitespace', async () => {
      const { email, password } = await registerUser(app);
      await http(app)
        .post('/auth/login')
        .send({ email: `  ${email.toUpperCase()}  `, password })
        .expect(200);
    });

    it('treats the password as case- and whitespace-sensitive', async () => {
      const { email } = await registerUser(app, {
        password: '  padded passphrase here  ',
      });
      await http(app)
        .post('/auth/login')
        .send({ email, password: '  padded passphrase here  ' })
        .expect(200);
      await http(app)
        .post('/auth/login')
        .send({ email, password: 'padded passphrase here' })
        .expect(401);
      await http(app)
        .post('/auth/login')
        .send({ email, password: '  PADDED passphrase here  ' })
        .expect(401);
    });

    it('issues a token with minimal claims, expiration, issuer and audience', async () => {
      const { email, password, user } = await registerUser(app);
      const token = await loginUser(app, email, password);
      const claims = decodeJwtPayload(token);
      expect(String(claims.sub)).toBe(String(user.id));
      expect(typeof claims.exp).toBe('number');
      expect(typeof claims.iat).toBe('number');
      expect((claims.exp as number) - (claims.iat as number)).toBe(15 * 60);
      expect(claims.iss).toBe(TEST_JWT_ISSUER);
      expect(claims.aud).toBe(TEST_JWT_AUDIENCE);
      expect(JSON.stringify(claims)).not.toMatch(/password|hash/i);
      expect(
        Object.keys(claims).filter(
          (k) => !['sub', 'email', 'iat', 'exp', 'iss', 'aud'].includes(k),
        ),
      ).toEqual([]);
    });

    it('is a real, verifiable HS256 token signed with the configured secret', async () => {
      const { user, email, password } = await registerUser(app);
      const token = await loginUser(app, email, password);
      const [header] = token.split('.');
      expect(JSON.parse(Buffer.from(header, 'base64url').toString()).alg).toBe(
        'HS256',
      );
      // Same signature as one produced independently with the test secret:
      const rebuilt = signTestJwt(
        decodeJwtPayload(token) as Record<string, unknown>,
      );
      expect(rebuilt.split('.')[2]).toBe(token.split('.')[2]);
      expect(user.id).toBeDefined();
    });

    it('returns 401 for a wrong password', async () => {
      const { email } = await registerUser(app);
      const res = await http(app)
        .post('/auth/login')
        .send({ email, password: 'wrong password!!' });
      expectApiError(res, 401);
      expect(res.body.accessToken).toBeUndefined();
    });

    it('returns 401 for an unknown email', async () => {
      const res = await http(app)
        .post('/auth/login')
        .send({ email: 'ghost@example.com', password: VALID_PASSWORD });
      expectApiError(res, 401);
      expect(res.body.accessToken).toBeUndefined();
    });

    it('gives the same public answer for an unknown email and a wrong password', async () => {
      const { email } = await registerUser(app);
      const wrongPassword = await http(app)
        .post('/auth/login')
        .send({ email, password: 'wrong password!!' });
      const unknownEmail = await http(app)
        .post('/auth/login')
        .send({ email: 'ghost@example.com', password: 'wrong password!!' });
      expect(unknownEmail.status).toBe(wrongPassword.status);
      expect(unknownEmail.body).toEqual(wrongPassword.body);
      expect(JSON.stringify(wrongPassword.body)).not.toContain(email);
    });

    it.each([
      ['missing email', { password: VALID_PASSWORD }, 'email'],
      ['missing password', { email: 'a@example.com' }, 'password'],
      ['empty body', {}, 'email'],
      ['numeric email', { email: 5, password: VALID_PASSWORD }, 'email'],
      [
        'array password',
        { email: 'a@example.com', password: ['x'] },
        'password',
      ],
      [
        'object email (injection style)',
        { email: { $ne: '' }, password: VALID_PASSWORD },
        'email',
      ],
      ['invalid email', { email: 'nope', password: VALID_PASSWORD }, 'email'],
    ])('returns 400 and no token for %s', async (_label, body, field) => {
      const res = await http(app).post('/auth/login').send(body);
      const errors = expectApiError(res, 400, { fields: true });
      expect(errors.map((e) => e.field)).toContain(field);
      expect(res.body.accessToken).toBeUndefined();
    });
  });

  describe('complete flow: register -> login -> GET /auth/me', () => {
    it('returns the logged-in user and nothing sensitive', async () => {
      const { token, user, email, password } = await registerAndLogin(app);
      const res = await http(app)
        .get('/auth/me')
        .set(...bearer(token))
        .expect(200);
      expect(res.body).toMatchObject({ id: user.id, email });
      expectNoCredentials(res.body, password);
    });

    it('returns different users for different tokens', async () => {
      const a = await registerAndLogin(app);
      const b = await registerAndLogin(app);
      const resA = await http(app)
        .get('/auth/me')
        .set(...bearer(a.token))
        .expect(200);
      const resB = await http(app)
        .get('/auth/me')
        .set(...bearer(b.token))
        .expect(200);
      expect(resA.body.id).toBe(a.user.id);
      expect(resB.body.id).toBe(b.user.id);
      expect(resA.body.id).not.toBe(resB.body.id);
    });

    it('rejects a request without a token (401)', async () => {
      expectApiError(await http(app).get('/auth/me'), 401);
    });

    it('rejects a malformed token (401)', async () => {
      expectApiError(
        await http(app)
          .get('/auth/me')
          .set(...bearer('not-a-jwt')),
        401,
      );
    });

    it('rejects an expired token (401)', async () => {
      const { user } = await registerUser(app);
      const expired = signTestJwt({ sub: user.id }, { expiresInSeconds: -60 });
      expectApiError(
        await http(app)
          .get('/auth/me')
          .set(...bearer(expired)),
        401,
      );
    });

    it('control: a correctly forged token for an existing user IS accepted', async () => {
      const { user } = await registerUser(app);
      const forged = signTestJwt({ sub: user.id });
      const res = await http(app)
        .get('/auth/me')
        .set(...bearer(forged))
        .expect(200);
      expect(res.body.id).toBe(user.id);
    });
  });

  describe('GET /auth/protected', () => {
    it('returns 200 for an authenticated user with a minimal body', async () => {
      const { token } = await registerAndLogin(app);
      const res = await http(app)
        .get('/auth/protected')
        .set(...bearer(token))
        .expect(200);
      expectNoCredentials(res.body);
      expect(JSON.stringify(res.body).length).toBeLessThan(200);
    });

    it('returns 401 without a token', async () => {
      expectApiError(await http(app).get('/auth/protected'), 401);
    });
  });

  describe('previous assignments keep working without a token', () => {
    it('projects and tasks stay public (authorization is a later assignment)', async () => {
      await http(app).get('/projects').expect(200);
      await http(app).get('/tasks').expect(200);
    });
  });
});
