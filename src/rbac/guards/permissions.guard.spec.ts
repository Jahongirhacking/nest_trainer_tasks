import { Reflector } from '@nestjs/core';
import { Permissions } from '../decorators/permissions.decorator.js';
import { Permission } from '../enums/permission.enum.js';
import { Role } from '../enums/role.enum.js';
import type { AuthenticatedUser } from '../rbac.types.js';
import { contextFor } from '../../../test/helpers/rbac-execution-context.js';
import { PermissionsGuard } from './permissions.guard.js';

// These tests rely on the matrix in role-permissions.ts, so complete that
// file first (role-permissions.spec.ts documents the expected matrix).

@Permissions(Permission.TASKS_READ)
class ControllerLevel {
  inherited() {}

  // adds to the controller's requirement: tasks.read AND tasks.delete
  @Permissions(Permission.TASKS_DELETE)
  merged() {}

  @Permissions(Permission.USERS_DELETE, Permission.ROLES_MANAGE)
  strict() {}
}

class RouteLevelOnly {
  open() {}

  @Permissions(Permission.TASKS_CREATE, Permission.TASKS_ASSIGN)
  createAndAssign() {}

  @Permissions(Permission.USERS_READ)
  readUsers() {}
}

const principal = (role: unknown): AuthenticatedUser =>
  ({ id: 1, email: 'x@example.com', role }) as AuthenticatedUser;
const admin = principal(Role.ADMIN);
const manager = principal(Role.MANAGER);
const user = principal(Role.USER);

describe('PermissionsGuard', () => {
  const guard = new PermissionsGuard(new Reflector());

  describe('route-level metadata', () => {
    it.each([
      ['ADMIN', admin, true],
      ['MANAGER', manager, true],
      ['USER', user, false],
    ])('users.read: %s -> %s', async (_name, who, expected) => {
      const ctx = contextFor(RouteLevelOnly, 'readUsers', who);
      expect(await guard.canActivate(ctx)).toBe(expected);
    });
  });

  describe('multiple permissions (ALL of them are required)', () => {
    it('allows a role that holds every listed permission', async () => {
      for (const who of [admin, manager]) {
        expect(await guard.canActivate(contextFor(RouteLevelOnly, 'createAndAssign', who))).toBe(true);
      }
    });

    it('denies a role that holds only some of them', async () => {
      // MANAGER has none of users.delete / roles.manage
      expect(await guard.canActivate(contextFor(ControllerLevel, 'strict', manager))).toBe(false);
      expect(await guard.canActivate(contextFor(ControllerLevel, 'strict', admin))).toBe(true);
    });

    it('denies a role that holds none of them', async () => {
      expect(await guard.canActivate(contextFor(RouteLevelOnly, 'createAndAssign', user))).toBe(false);
    });
  });

  describe('controller-level metadata', () => {
    it('applies to a route that declares nothing itself', async () => {
      expect(await guard.canActivate(contextFor(ControllerLevel, 'inherited', manager))).toBe(true);
      expect(await guard.canActivate(contextFor(ControllerLevel, 'inherited', user))).toBe(false);
    });
  });

  describe('route-level metadata vs controller-level metadata', () => {
    it('route-level permissions are ADDED to the controller-level ones (README "Metadata rules")', async () => {
      // tasks.read (controller) + tasks.delete (route): MANAGER lacks the second
      expect(await guard.canActivate(contextFor(ControllerLevel, 'merged', manager))).toBe(false);
      expect(await guard.canActivate(contextFor(ControllerLevel, 'merged', admin))).toBe(true);
    });
  });

  describe('missing metadata', () => {
    it('lets any authenticated caller through when no permissions are declared', async () => {
      for (const who of [admin, manager, user]) {
        expect(await guard.canActivate(contextFor(RouteLevelOnly, 'open', who))).toBe(true);
      }
    });
  });

  describe('bad principals', () => {
    it('denies when permissions are required but nobody is authenticated', async () => {
      expect(await guard.canActivate(contextFor(RouteLevelOnly, 'readUsers'))).toBe(false);
    });

    it.each([
      ['missing', undefined],
      ['unknown', 'superadmin'],
      ['wrong case', 'MANAGER'],
    ])('denies a principal whose role is %s', async (_name, role) => {
      const ctx = contextFor(RouteLevelOnly, 'readUsers', principal(role));
      expect(await guard.canActivate(ctx)).toBe(false);
    });
  });
});
