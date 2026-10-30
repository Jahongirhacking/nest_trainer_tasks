import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator.js';
import { Role } from '../enums/role.enum.js';
import type { AuthenticatedUser } from '../rbac.types.js';
import { contextFor } from '../../../test/helpers/rbac-execution-context.js';
import { RolesGuard } from './roles.guard.js';

// Fixtures: classes carrying real metadata, read through a real Reflector.

@Roles(Role.MANAGER)
class ControllerLevel {
  inherited() {}

  @Roles(Role.ADMIN)
  overridden() {}

  @Roles(Role.ADMIN, Role.MANAGER)
  severalRoles() {}

  @Roles()
  nobody() {}
}

class RouteLevelOnly {
  open() {}

  @Roles(Role.USER)
  userOnly() {}
}

const principal = (role: unknown): AuthenticatedUser =>
  ({ id: 1, email: 'x@example.com', role }) as AuthenticatedUser;
const admin = principal(Role.ADMIN);
const manager = principal(Role.MANAGER);
const user = principal(Role.USER);

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  describe('route-level metadata', () => {
    it('allows a caller whose role is listed', async () => {
      const ctx = contextFor(RouteLevelOnly, 'userOnly', user);
      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('denies a caller whose role is not listed', async () => {
      expect(await guard.canActivate(contextFor(RouteLevelOnly, 'userOnly', admin))).toBe(false);
      expect(await guard.canActivate(contextFor(RouteLevelOnly, 'userOnly', manager))).toBe(false);
    });
  });

  describe('multiple roles (any of them is enough)', () => {
    it.each([
      ['ADMIN', admin, true],
      ['MANAGER', manager, true],
      ['USER', user, false],
    ])('%s -> %s', async (_name, who, expected) => {
      const ctx = contextFor(ControllerLevel, 'severalRoles', who);
      expect(await guard.canActivate(ctx)).toBe(expected);
    });
  });

  describe('controller-level metadata', () => {
    it('applies to a route that declares nothing itself', async () => {
      expect(await guard.canActivate(contextFor(ControllerLevel, 'inherited', manager))).toBe(true);
      expect(await guard.canActivate(contextFor(ControllerLevel, 'inherited', admin))).toBe(false);
      expect(await guard.canActivate(contextFor(ControllerLevel, 'inherited', user))).toBe(false);
    });
  });

  describe('route-level metadata vs controller-level metadata', () => {
    it('route-level REPLACES controller-level (README "Metadata rules")', async () => {
      // the controller says MANAGER, the route says ADMIN: only ADMIN passes
      expect(await guard.canActivate(contextFor(ControllerLevel, 'overridden', admin))).toBe(true);
      expect(await guard.canActivate(contextFor(ControllerLevel, 'overridden', manager))).toBe(false);
    });
  });

  describe('missing metadata', () => {
    it('lets any authenticated caller through when no roles are declared', async () => {
      for (const who of [admin, manager, user]) {
        expect(await guard.canActivate(contextFor(RouteLevelOnly, 'open', who))).toBe(true);
      }
    });
  });

  describe('empty @Roles()', () => {
    it('denies everybody (an empty requirement can never be met)', async () => {
      for (const who of [admin, manager, user]) {
        expect(await guard.canActivate(contextFor(ControllerLevel, 'nobody', who))).toBe(false);
      }
    });
  });

  describe('bad principals', () => {
    it('denies when roles are required but nobody is authenticated', async () => {
      expect(await guard.canActivate(contextFor(RouteLevelOnly, 'userOnly'))).toBe(false);
    });

    it.each([
      ['missing', undefined],
      ['null', null],
      ['unknown', 'superadmin'],
      ['wrong case', 'ADMIN'],
      ['an array', [Role.ADMIN]],
    ])('denies a principal whose role is %s', async (_name, role) => {
      const ctx = contextFor(ControllerLevel, 'severalRoles', principal(role));
      expect(await guard.canActivate(ctx)).toBe(false);
    });
  });
});
