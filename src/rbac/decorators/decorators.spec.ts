import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../enums/permission.enum.js';
import { Role } from '../enums/role.enum.js';
import { PERMISSIONS_KEY, ROLES_KEY } from '../rbac.constants.js';
import { CurrentUser } from './current-user.decorator.js';
import { Permissions } from './permissions.decorator.js';
import { Roles } from './roles.decorator.js';

@Roles(Role.MANAGER)
@Permissions(Permission.TASKS_READ)
class Probe {
  @Roles(Role.ADMIN, Role.MANAGER)
  @Permissions(Permission.TASKS_CREATE, Permission.TASKS_ASSIGN)
  decorated() {}

  @Roles()
  nobody() {}

  plain() {}

  whole(@CurrentUser() _user: unknown) {}
  role(@CurrentUser('role') _role: unknown) {}
}

const reflector = new Reflector();

describe('@Roles()', () => {
  it('stores the roles on a route handler under ROLES_KEY', () => {
    expect(reflector.get(ROLES_KEY, Probe.prototype.decorated)).toEqual([
      Role.ADMIN,
      Role.MANAGER,
    ]);
  });

  it('stores the roles on a controller class under ROLES_KEY', () => {
    expect(reflector.get(ROLES_KEY, Probe)).toEqual([Role.MANAGER]);
  });

  it('stores an EMPTY list (not nothing) when called without roles', () => {
    expect(reflector.get(ROLES_KEY, Probe.prototype.nobody)).toEqual([]);
  });

  it('leaves undecorated handlers without metadata', () => {
    expect(reflector.get(ROLES_KEY, Probe.prototype.plain)).toBeUndefined();
  });
});

describe('@Permissions()', () => {
  it('stores the permissions on a route handler under PERMISSIONS_KEY', () => {
    expect(
      reflector.get(PERMISSIONS_KEY, Probe.prototype.decorated),
    ).toEqual([Permission.TASKS_CREATE, Permission.TASKS_ASSIGN]);
  });

  it('stores the permissions on a controller class under PERMISSIONS_KEY', () => {
    expect(reflector.get(PERMISSIONS_KEY, Probe)).toEqual([
      Permission.TASKS_READ,
    ]);
  });

  it('leaves undecorated handlers without metadata', () => {
    expect(
      reflector.get(PERMISSIONS_KEY, Probe.prototype.plain),
    ).toBeUndefined();
  });

  it('does not mix up roles and permissions', () => {
    expect(reflector.get(ROLES_KEY, Probe.prototype.decorated)).not.toContain(
      Permission.TASKS_CREATE,
    );
  });
});

/** See src/auth/decorators/current-user.decorator.spec.ts for the technique. */
function factoryFor(method: 'whole' | 'role') {
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, method);
  const entry = Object.values(metadata)[0] as {
    factory: (data: unknown, ctx: ExecutionContext) => unknown;
    data: unknown;
  };
  return (request: object) =>
    entry.factory(entry.data, {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext);
}

describe('@CurrentUser()', () => {
  const principal = { id: 7, email: 'dev@example.com', role: Role.MANAGER };

  it('returns the authenticated principal', () => {
    expect(factoryFor('whole')({ user: principal })).toEqual(principal);
  });

  it('returns one property, such as the role', () => {
    expect(factoryFor('role')({ user: principal })).toBe(Role.MANAGER);
  });

  it('never reads identity or role from the body, query or headers', () => {
    const request = {
      user: principal,
      body: { id: 1, role: Role.ADMIN },
      query: { role: Role.ADMIN },
      headers: { 'x-role': Role.ADMIN },
    };
    expect(factoryFor('whole')(request)).toEqual(principal);
    expect(factoryFor('role')(request)).toBe(Role.MANAGER);
  });

  it('returns undefined when nothing authenticated the request', () => {
    expect(factoryFor('whole')({ body: { role: Role.ADMIN } })).toBeUndefined();
    expect(factoryFor('role')({ body: { role: Role.ADMIN } })).toBeUndefined();
  });
});
