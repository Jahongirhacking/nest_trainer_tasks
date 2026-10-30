import { Role } from './enums/role.enum.js';
import { createFixture, ids, type Fixture } from '../../test/helpers/rbac-app.js';
import { call, type Method } from '../../test/helpers/rbac-http.js';

/**
 * HTTP-level tests of the access rules (README "API endpoints"). They run the
 * REAL controllers, guards and JWT strategy on in-memory repositories. Every
 * test says who calls what and which status it expects:
 *
 *   401 = authentication failed (we do not know who you are)
 *   403 = authenticated, but your role may not do this
 */

const PASSWORD = 'correct horse battery staple';

interface Endpoint {
  name: string;
  method: Method;
  url: (taskId: number) => string;
  body?: () => object;
  /** Roles that must get through (a 2xx). Everybody else must get 403. */
  allowed: Role[];
}

const ADMIN_ONLY = [Role.ADMIN];
const STAFF = [Role.ADMIN, Role.MANAGER];
const EVERYONE = [Role.ADMIN, Role.MANAGER, Role.USER];

const endpoints: Endpoint[] = [
  { name: 'GET /users', method: 'get', url: () => '/users', allowed: STAFF },
  {
    name: 'POST /users',
    method: 'post',
    url: () => '/users',
    body: () => ({
      email: `new-${Date.now()}@example.com`,
      password: PASSWORD,
      role: Role.USER,
    }),
    allowed: ADMIN_ONLY,
  },
  {
    name: 'PATCH /users/:id',
    method: 'patch',
    url: () => `/users/${ids.otherUser}`,
    body: () => ({ email: 'renamed@example.com' }),
    allowed: ADMIN_ONLY,
  },
  {
    name: 'DELETE /users/:id',
    method: 'delete',
    url: () => `/users/${ids.otherUser}`,
    allowed: ADMIN_ONLY,
  },
  { name: 'GET /tasks', method: 'get', url: () => '/tasks', allowed: STAFF },
  {
    name: 'POST /tasks',
    method: 'post',
    url: () => '/tasks',
    body: () => ({ title: 'A new task' }),
    allowed: STAFF,
  },
  {
    name: 'GET /tasks/my',
    method: 'get',
    url: () => '/tasks/my',
    allowed: EVERYONE,
  },
  {
    name: 'PATCH /tasks/:id',
    method: 'patch',
    url: (id) => `/tasks/${id}`,
    body: () => ({ title: 'Renamed' }),
    allowed: STAFF,
  },
  {
    name: 'PATCH /tasks/:id/assign',
    method: 'patch',
    url: (id) => `/tasks/${id}/assign`,
    body: () => ({ assigneeId: ids.user }),
    allowed: STAFF,
  },
  {
    name: 'DELETE /tasks/:id',
    method: 'delete',
    url: (id) => `/tasks/${id}`,
    allowed: ADMIN_ONLY,
  },
];

const accountOf: Record<Role, number> = {
  [Role.ADMIN]: ids.admin,
  [Role.MANAGER]: ids.manager,
  [Role.USER]: ids.user,
};

describe('RBAC endpoints', () => {
  let f: Fixture;
  let taskId: number;

  beforeEach(async () => {
    f = await createFixture();
    taskId = f.seedTask({ assigneeId: ids.user }).id;
  });

  afterEach(async () => {
    await f.app.close();
  });

  describe('authentication (401): who are you?', () => {
    const everyRoute = [
      ...endpoints,
      {
        name: 'PATCH /tasks/:id/status',
        method: 'patch' as Method,
        url: (id: number) => `/tasks/${id}/status`,
        body: () => ({ status: 'done' }),
      },
    ];

    it.each(everyRoute.map((e) => [e.name, e] as const))(
      '%s without a token -> 401',
      async (_name, e) => {
        const res = await call(f, e.method, e.url(taskId), undefined, e.body?.());
        expect(res.status).toBe(401);
      },
    );

    it('rejects a malformed token with 401, not 403', async () => {
      const res = await f
        .http()
        .get('/users')
        .set('Authorization', 'Bearer not.a.jwt');
      expect(res.status).toBe(401);
    });

    it('answers 401 (not 403) to an anonymous caller of an ADMIN-only route', async () => {
      expect((await call(f, 'delete', `/users/${ids.otherUser}`)).status).toBe(
        401,
      );
    });

    it('answers 401 when the token is valid but the account was deleted', async () => {
      const header = f.as(ids.admin);
      f.users.rows.splice(
        f.users.rows.findIndex((u) => u.id === ids.admin),
        1,
      );
      expect((await f.http().get('/users').set(...header)).status).toBe(401);
    });
  });

  describe('authorization (403): what may you do?', () => {
    const cases = endpoints.flatMap((e) =>
      Object.values(Role).map((role) => ({
        label: `${role.toUpperCase()} ${
          e.allowed.includes(role) ? 'can' : 'cannot'
        } ${e.name}`,
        e,
        role,
        allowed: e.allowed.includes(role),
      })),
    );

    it.each(cases.map((c) => [c.label, c] as const))('%s', async (_l, c) => {
      const res = await call(
        f,
        c.e.method,
        c.e.url(taskId),
        accountOf[c.role],
        c.e.body?.(),
      );
      if (c.allowed) {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(300);
      } else {
        expect(res.status).toBe(403);
      }
    });
  });

  describe('exact success responses', () => {
    it('ADMIN gets 201 for POST /users and the body has no credentials', async () => {
      const res = await call(f, 'post', '/users', ids.admin, {
        email: 'created@example.com',
        password: PASSWORD,
        role: Role.MANAGER,
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        email: 'created@example.com',
        role: Role.MANAGER,
      });
      expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
    });

    it('ADMIN gets 204 for DELETE /users/:id and the account is gone', async () => {
      const res = await call(f, 'delete', `/users/${ids.otherUser}`, ids.admin);
      expect(res.status).toBe(204);
      expect(f.users.rows.some((u) => u.id === ids.otherUser)).toBe(false);
    });

    it('ADMIN gets 204 for DELETE /tasks/:id and the task is gone', async () => {
      const res = await call(f, 'delete', `/tasks/${taskId}`, ids.admin);
      expect(res.status).toBe(204);
      expect(f.tasks.rows).toHaveLength(0);
    });

    it('GET /users never leaks password hashes', async () => {
      const res = await call(f, 'get', '/users', ids.manager);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(4);
      expect(JSON.stringify(res.body)).not.toMatch(/password|hash|argon2/i);
    });
  });

  describe('a forbidden caller learns nothing and changes nothing', () => {
    it('answers 403 before validating the body (authorization precedes validation)', async () => {
      const res = await call(f, 'post', '/users', ids.user, {});
      expect(res.status).toBe(403);
    });

    it('answers 403 before looking the resource up (no 404 for a forbidden caller)', async () => {
      expect((await call(f, 'delete', '/tasks/9999', ids.manager)).status).toBe(
        403,
      );
      expect((await call(f, 'delete', '/users/9999', ids.user)).status).toBe(
        403,
      );
    });

    it('does not run the handler for a forbidden caller', async () => {
      await call(f, 'delete', `/tasks/${taskId}`, ids.manager);
      await call(f, 'delete', `/users/${ids.otherUser}`, ids.manager);
      expect(f.tasks.remove).not.toHaveBeenCalled();
      expect(f.users.remove).not.toHaveBeenCalled();
    });
  });

  describe('roles come from the database, never from the token', () => {
    it('ignores a role claim inside the token', async () => {
      const token = f.tokenFor(ids.user, {
        role: 'admin',
        roles: ['admin'],
        permissions: ['*'],
      });
      const res = await f
        .http()
        .get('/users')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('applies a role change immediately, with the same token', async () => {
      const header = f.as(ids.admin);
      expect((await f.http().get('/users').set(...header)).status).toBe(200);
      f.users.rows.find((u) => u.id === ids.admin)!.role = Role.USER;
      expect((await f.http().get('/users').set(...header)).status).toBe(403);
    });
  });

  describe('MANAGER cannot manage roles or permissions', () => {
    it('cannot change anybody\'s role, not even their own', async () => {
      for (const target of [ids.user, ids.manager]) {
        const res = await call(f, 'patch', `/users/${target}`, ids.manager, {
          role: Role.ADMIN,
        });
        expect(res.status).toBe(403);
      }
      expect(f.users.rows.find((u) => u.id === ids.manager)!.role).toBe(
        Role.MANAGER,
      );
    });

    it('cannot create an ADMIN account', async () => {
      const before = f.users.rows.length;
      const res = await call(f, 'post', '/users', ids.manager, {
        email: 'sneaky@example.com',
        password: PASSWORD,
        role: Role.ADMIN,
      });
      expect(res.status).toBe(403);
      expect(f.users.rows).toHaveLength(before);
    });
  });

  describe('USER cannot escalate', () => {
    it('cannot promote themselves', async () => {
      const res = await call(f, 'patch', `/users/${ids.user}`, ids.user, {
        role: Role.ADMIN,
      });
      expect(res.status).toBe(403);
      expect(f.users.rows.find((u) => u.id === ids.user)!.role).toBe(Role.USER);
    });
  });

  describe('GET /tasks/my', () => {
    it('is not captured by the :id routes', async () => {
      const res = await call(f, 'get', '/tasks/my', ids.user);
      expect(res.status).toBe(200);
    });

    it('returns only the tasks assigned to the caller', async () => {
      f.seedTask({ title: 'Mine too', assigneeId: ids.user });
      f.seedTask({ title: 'Not mine', assigneeId: ids.otherUser });
      f.seedTask({ title: 'Nobody', assigneeId: null });
      const res = await call(f, 'get', '/tasks/my', ids.user);
      expect(res.body.map((t: { title: string }) => t.title).sort()).toEqual(
        ['Mine too', 'Seeded task'].sort(),
      );
    });

    it('returns an empty list for a user with no tasks', async () => {
      const res = await call(f, 'get', '/tasks/my', ids.otherUser);
      expect(res.body).toEqual([]);
    });
  });
});
