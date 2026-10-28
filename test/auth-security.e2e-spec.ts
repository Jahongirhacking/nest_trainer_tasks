import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { expectApiError } from './helpers/api-error.js';
import { createTestApp, http, resetDatabase } from './helpers/app.js';
import {
  bearer,
  countUsers,
  deleteUserRow,
  expectNoCredentials,
  registerAndLogin,
  registerUser,
  uniqueEmail,
  VALID_PASSWORD,
} from './helpers/auth.js';
import { signTestJwt, tamperPayload } from './helpers/jwt.js';

describe('Authentication security (e2e, PostgreSQL)', () => {
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

  describe('credential leakage', () => {
    it('registration, login and /auth/me never return passwords or hashes', async () => {
      const email = uniqueEmail();
      const registered = await http(app)
        .post('/auth/register')
        .send({ email, password: VALID_PASSWORD })
        .expect(201);
      const login = await http(app)
        .post('/auth/login')
        .send({ email, password: VALID_PASSWORD })
        .expect(200);
      const me = await http(app)
        .get('/auth/me')
        .set(...bearer(login.body.accessToken))
        .expect(200);
      for (const res of [registered, login, me]) {
        expectNoCredentials(res.body, VALID_PASSWORD);
        expect(JSON.stringify(res.headers)).not.toContain(VALID_PASSWORD);
      }
    });

    it('failed logins do not issue tokens', async () => {
      const { email } = await registerUser(app);
      for (const body of [
        { email, password: 'wrong password!!' },
        { email: 'ghost@example.com', password: VALID_PASSWORD },
        { email },
        {},
      ]) {
        const res = await http(app).post('/auth/login').send(body);
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
        expect(JSON.stringify(res.body)).not.toMatch(/eyJ[\w-]+\.[\w-]+\./);
      }
    });

    it('error responses never contain stack traces or internals', async () => {
      const responses = [
        await http(app).get('/auth/me'),
        await http(app)
          .get('/auth/me')
          .set(...bearer('abc.def.ghi')),
        await http(app)
          .post('/auth/login')
          .send({ email: 'ghost@example.com', password: VALID_PASSWORD }),
      ];
      for (const res of responses) {
        const raw = JSON.stringify(res.body);
        expect(raw).not.toMatch(
          /\n\s+at\s|node_modules|jsonwebtoken|passport|secret/i,
        );
      }
    });
  });

  describe('identity cannot be supplied by the client', () => {
    it('GET /auth/me ignores ids in the query string and the body', async () => {
      const a = await registerAndLogin(app);
      const b = await registerAndLogin(app);
      const res = await http(app)
        .get('/auth/me')
        .query({ id: b.user.id, userId: b.user.id, email: b.email })
        .set(...bearer(a.token))
        .send({ id: b.user.id, userId: b.user.id, email: b.email })
        .expect(200);
      expect(res.body.id).toBe(a.user.id);
      expect(res.body.email).toBe(a.email);
    });

    it('login ignores identity fields in the body or authenticates the real owner', async () => {
      const a = await registerUser(app);
      const b = await registerUser(app);
      const res = await http(app)
        .post('/auth/login')
        .send({
          email: a.email,
          password: a.password,
          id: b.user.id,
          userId: b.user.id,
        });
      if (res.status === 200) {
        const me = await http(app)
          .get('/auth/me')
          .set(...bearer(res.body.accessToken))
          .expect(200);
        expect(me.body.id).toBe(a.user.id);
      } else {
        expect(res.status).toBe(400);
      }
    });

    it('rejects client-supplied roles and permissions at registration', async () => {
      for (const extra of [
        { role: 'admin' },
        { roles: ['admin'] },
        { permissions: ['*'] },
        { isAdmin: true },
      ]) {
        const res = await http(app)
          .post('/auth/register')
          .send({ email: uniqueEmail(), password: VALID_PASSWORD, ...extra });
        expectApiError(res, 400, { fields: true });
      }
      expect(await countUsers(app)).toBe(0);
    });

    it('does not turn role/permission claims inside a token into trusted data', async () => {
      const { user } = await registerUser(app);
      const forged = signTestJwt({
        sub: user.id,
        role: 'admin',
        roles: ['admin'],
        permissions: ['*'],
        isAdmin: true,
      });
      const res = await http(app)
        .get('/auth/me')
        .set(...bearer(forged))
        .expect(200);
      expect(res.body.id).toBe(user.id);
      for (const key of ['role', 'roles', 'permissions', 'isAdmin']) {
        expect(res.body).not.toHaveProperty(key);
      }
    });
  });

  describe('token verification', () => {
    it.each([
      [
        'wrong secret',
        (id: number) =>
          signTestJwt(
            { sub: id },
            { secret: 'a-completely-different-secret-0123456789' },
          ),
      ],
      [
        'expired',
        (id: number) => signTestJwt({ sub: id }, { expiresInSeconds: -1 }),
      ],
      [
        'unsigned (alg none)',
        (id: number) => signTestJwt({ sub: id }, { alg: 'none' }),
      ],
      [
        'wrong issuer',
        (id: number) => signTestJwt({ sub: id }, { issuer: 'someone-else' }),
      ],
      [
        'wrong audience',
        (id: number) => signTestJwt({ sub: id }, { audience: 'another-api' }),
      ],
      ['no issuer', (id: number) => signTestJwt({ sub: id }, { issuer: null })],
      [
        'no audience',
        (id: number) => signTestJwt({ sub: id }, { audience: null }),
      ],
      [
        'tampered payload',
        (id: number) =>
          tamperPayload(signTestJwt({ sub: id }), { sub: id + 1 }),
      ],
    ])('rejects a token with %s', async (_label, makeToken) => {
      const { user } = await registerUser(app);
      expectApiError(
        await http(app)
          .get('/auth/me')
          .set(...bearer(makeToken(user.id))),
        401,
      );
      expectApiError(
        await http(app)
          .get('/auth/protected')
          .set(...bearer(makeToken(user.id))),
        401,
      );
    });

    it.each([
      ['missing', undefined],
      ['not a number', 'abc'],
      ['zero', 0],
      ['negative', -1],
      ['an object', { $ne: 0 }],
      ['an unknown user id', 999999],
    ])(
      'rejects a validly signed token whose subject is %s',
      async (_label, sub) => {
        const claims = sub === undefined ? {} : { sub };
        expectApiError(
          await http(app)
            .get('/auth/me')
            .set(...bearer(signTestJwt(claims))),
          401,
        );
      },
    );

    it('does not read the token from the query string or another scheme', async () => {
      const { user } = await registerUser(app);
      const token = signTestJwt({ sub: user.id });
      expectApiError(
        await http(app).get('/auth/me').query({ access_token: token }),
        401,
      );
      expectApiError(await http(app).get('/auth/me').query({ token }), 401);
      expectApiError(
        await http(app).get('/auth/me').set('Authorization', `Basic ${token}`),
        401,
      );
      expectApiError(
        await http(app).get('/auth/me').set('Authorization', token),
        401,
      );
    });

    it('rejects a valid token once its user has been deleted', async () => {
      const { token, user } = await registerAndLogin(app);
      await http(app)
        .get('/auth/me')
        .set(...bearer(token))
        .expect(200);
      await deleteUserRow(app, user.id);
      expectApiError(
        await http(app)
          .get('/auth/me')
          .set(...bearer(token)),
        401,
      );
      expectApiError(
        await http(app)
          .get('/auth/protected')
          .set(...bearer(token)),
        401,
      );
    });
  });

  describe('data integrity', () => {
    it('concurrent duplicate registrations create exactly one account', async () => {
      const email = uniqueEmail();
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          http(app)
            .post('/auth/register')
            .send({ email, password: VALID_PASSWORD }),
        ),
      );
      const statuses = results.map((r) => r.status);
      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(7);
      expect(await countUsers(app)).toBe(1);
    });
  });

  describe('scope', () => {
    it('has no logout endpoint pretending to revoke JWTs', async () => {
      expect((await http(app).post('/auth/logout')).status).toBe(404);
      expect((await http(app).get('/auth/logout')).status).toBe(404);
    });

    it('has no refresh-token endpoint', async () => {
      expect((await http(app).post('/auth/refresh')).status).toBe(404);
    });
  });

  describe('configuration', () => {
    const KEYS = ['NODE_ENV', 'JWT_SECRET'] as const;
    const saved: Partial<Record<(typeof KEYS)[number], string | undefined>> =
      {};
    beforeEach(() => KEYS.forEach((k) => (saved[k] = process.env[k])));
    afterEach(() =>
      KEYS.forEach((k) => {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }),
    );

    // An EMPTY value (not a deleted variable) is used on purpose: the
    // application may load `.env` for missing variables, never for set ones.
    it.each([
      ['an empty', ''],
      ['a whitespace-only', '    '],
      ['a weak', 'short'],
    ])(
      'refuses to start in production with %s JWT_SECRET',
      async (_label, secret) => {
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = secret;
        await expect(createTestApp()).rejects.toThrow();
      },
    );

    it('refuses to start without a JWT_SECRET, whatever the environment', async () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = '';
      await expect(createTestApp()).rejects.toThrow();
    });
  });
});
