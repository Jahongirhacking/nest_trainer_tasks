import { Role } from './enums/role.enum.js';
import { TaskStatus } from './enums/task-status.enum.js';
import { call, type Method } from '../../test/helpers/rbac-http.js';
import { createFixture, ids, type Fixture } from '../../test/helpers/rbac-app.js';

/**
 * Resource-level authorization: roles say what a caller may do in general,
 * ownership depends on the specific task (README "Ownership rules" and
 * "Assignment rules").
 */
describe('task ownership and assignment', () => {
  let f: Fixture;
  let mine: number; // assigned to USER (3)
  let theirs: number; // assigned to otherUser (4)
  let unassigned: number;

  beforeEach(async () => {
    f = await createFixture();
    mine = f.seedTask({ assigneeId: ids.user }).id;
    theirs = f.seedTask({ assigneeId: ids.otherUser }).id;
    unassigned = f.seedTask({ assigneeId: null }).id;
  });

  afterEach(async () => {
    await f.app.close();
  });

  const statusOf = (id: number) =>
    f.tasks.rows.find((t) => t.id === id)!.status;
  const done = { status: TaskStatus.DONE };

  describe('PATCH /tasks/:id/status (owner or ADMIN)', () => {
    it('lets the owner change the status of their own task', async () => {
      const res = await call(f, 'patch', `/tasks/${mine}/status`, ids.user, done);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(TaskStatus.DONE);
      expect(statusOf(mine)).toBe(TaskStatus.DONE);
    });

    it('USER cannot update the status of another user\'s task (403)', async () => {
      const res = await call(f, 'patch', `/tasks/${theirs}/status`, ids.user, done);
      expect(res.status).toBe(403);
      expect(statusOf(theirs)).toBe(TaskStatus.TODO);
    });

    it('USER cannot touch a task that is assigned to nobody (403)', async () => {
      const res = await call(
        f,
        'patch',
        `/tasks/${unassigned}/status`,
        ids.user,
        done,
      );
      expect(res.status).toBe(403);
      expect(statusOf(unassigned)).toBe(TaskStatus.TODO);
    });

    it('ADMIN can update the status of another user\'s task', async () => {
      const res = await call(f, 'patch', `/tasks/${theirs}/status`, ids.admin, done);
      expect(res.status).toBe(200);
      expect(statusOf(theirs)).toBe(TaskStatus.DONE);
    });

    it('ADMIN can update the status of an unassigned task', async () => {
      const res = await call(
        f,
        'patch',
        `/tasks/${unassigned}/status`,
        ids.admin,
        done,
      );
      expect(res.status).toBe(200);
    });

    it('MANAGER is not an owner just because of the role (403 on others\' tasks)', async () => {
      const res = await call(f, 'patch', `/tasks/${mine}/status`, ids.manager, done);
      expect(res.status).toBe(403);
      expect(statusOf(mine)).toBe(TaskStatus.TODO);
    });

    it('MANAGER can update the status of a task assigned to themselves', async () => {
      const own = f.seedTask({ assigneeId: ids.manager }).id;
      const res = await call(f, 'patch', `/tasks/${own}/status`, ids.manager, done);
      expect(res.status).toBe(200);
    });

    it('answers 404 for a missing task, for ADMIN and for USER alike', async () => {
      for (const who of [ids.admin, ids.user]) {
        const res = await call(f, 'patch', '/tasks/9999/status', who, done);
        expect(res.status).toBe(404);
      }
    });

    it('checks ownership BEFORE validating the body (non-owner + bad body -> 403)', async () => {
      const res = await call(f, 'patch', `/tasks/${theirs}/status`, ids.user, {
        status: 'nonsense',
      });
      expect(res.status).toBe(403);
    });

    it('still validates the body for an owner (owner + bad body -> 400)', async () => {
      const res = await call(f, 'patch', `/tasks/${mine}/status`, ids.user, {
        status: 'nonsense',
      });
      expect(res.status).toBe(400);
      expect(statusOf(mine)).toBe(TaskStatus.TODO);
    });

    it.each(['abc', '1.5', '-1', '0', '1%20OR%201=1'])(
      'never crashes on the id "%s" (no 5xx, no success)',
      async (badId) => {
        const res = await call(
          f,
          'patch',
          `/tasks/${badId}/status`,
          ids.user,
          done,
        );
        expect([400, 403, 404]).toContain(res.status);
      },
    );

    it('follows the CURRENT assignee: reassigning moves the access', async () => {
      await call(f, 'patch', `/tasks/${mine}/assign`, ids.admin, {
        assigneeId: ids.otherUser,
      });
      expect(
        (await call(f, 'patch', `/tasks/${mine}/status`, ids.user, done)).status,
      ).toBe(403);
      expect(
        (await call(f, 'patch', `/tasks/${mine}/status`, ids.otherUser, done))
          .status,
      ).toBe(200);
    });
  });

  describe('USER cannot manage tasks, not even their own', () => {
    const forbidden: [string, Method, () => string, object | undefined][] = [
      ['PATCH /tasks/:id (own task)', 'patch', () => `/tasks/${mine}`, { title: 'x' }],
      ['PATCH /tasks/:id (someone else\'s task)', 'patch', () => `/tasks/${theirs}`, { title: 'x' }],
      ['DELETE /tasks/:id (own task)', 'delete', () => `/tasks/${mine}`, undefined],
      ['POST /tasks', 'post', () => '/tasks', { title: 'x' }],
      ['PATCH /tasks/:id/assign (own task)', 'patch', () => `/tasks/${mine}/assign`, { assigneeId: ids.user }],
    ];

    it.each(forbidden)('%s -> 403', async (_name, method, url, body) => {
      const res = await call(f, method, url(), ids.user, body);
      expect(res.status).toBe(403);
    });

    it('cannot see other users\' tasks through the list endpoint', async () => {
      expect((await call(f, 'get', '/tasks', ids.user)).status).toBe(403);
    });
  });

  describe('assignment rules (README "Assignment rules")', () => {
    it('MANAGER can assign a task to a USER', async () => {
      const res = await call(f, 'patch', `/tasks/${unassigned}/assign`, ids.manager, {
        assigneeId: ids.otherUser,
      });
      expect(res.status).toBe(200);
      expect(res.body.assigneeId).toBe(ids.otherUser);
    });

    it.each([
      ['an ADMIN', ids.admin],
      ['another MANAGER', ids.manager],
    ])('MANAGER cannot assign a task to %s (403)', async (_name, assignee) => {
      const res = await call(f, 'patch', `/tasks/${unassigned}/assign`, ids.manager, {
        assigneeId: assignee,
      });
      expect(res.status).toBe(403);
      expect(f.tasks.rows.find((t) => t.id === unassigned)!.assigneeId).toBeNull();
    });

    it('ADMIN can assign a task to anybody', async () => {
      for (const assignee of [ids.admin, ids.manager, ids.user]) {
        const res = await call(f, 'patch', `/tasks/${unassigned}/assign`, ids.admin, {
          assigneeId: assignee,
        });
        expect(res.status).toBe(200);
        expect(res.body.assigneeId).toBe(assignee);
      }
    });

    it('answers 404 for an unknown assignee', async () => {
      const res = await call(f, 'patch', `/tasks/${unassigned}/assign`, ids.manager, {
        assigneeId: 9999,
      });
      expect(res.status).toBe(404);
    });

    it('answers 404 for an unknown task', async () => {
      const res = await call(f, 'patch', '/tasks/9999/assign', ids.manager, {
        assigneeId: ids.user,
      });
      expect(res.status).toBe(404);
    });

    it('applies the rule to the assignee\'s CURRENT role', async () => {
      // otherUser is promoted to MANAGER: a manager may no longer assign to them
      f.users.rows.find((u) => u.id === ids.otherUser)!.role = Role.MANAGER;
      const res = await call(f, 'patch', `/tasks/${unassigned}/assign`, ids.manager, {
        assigneeId: ids.otherUser,
      });
      expect(res.status).toBe(403);
    });
  });
});
