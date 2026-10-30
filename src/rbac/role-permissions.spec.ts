import { Permission } from './enums/permission.enum.js';
import { Role } from './enums/role.enum.js';
import { ROLE_PERMISSIONS } from './role-permissions.js';

/** README "Role and permission matrix". */
describe('ROLE_PERMISSIONS (the role -> permission matrix)', () => {
  it('has an entry for every role', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(
      Object.values(Role).sort(),
    );
  });

  it('grants ADMIN every permission that exists', () => {
    expect([...ROLE_PERMISSIONS[Role.ADMIN]].sort()).toEqual(
      Object.values(Permission).sort(),
    );
  });

  it('grants MANAGER exactly the manager permissions', () => {
    expect([...ROLE_PERMISSIONS[Role.MANAGER]].sort()).toEqual(
      [
        Permission.USERS_READ,
        Permission.TASKS_READ,
        Permission.TASKS_CREATE,
        Permission.TASKS_UPDATE,
        Permission.TASKS_ASSIGN,
      ].sort(),
    );
  });

  it.each([
    Permission.USERS_CREATE,
    Permission.USERS_UPDATE,
    Permission.USERS_DELETE,
    Permission.TASKS_DELETE,
    Permission.ROLES_MANAGE,
  ])('does not grant MANAGER %s', (permission) => {
    expect(ROLE_PERMISSIONS[Role.MANAGER]).not.toContain(permission);
  });

  it('grants USER no administrative permission at all', () => {
    expect(ROLE_PERMISSIONS[Role.USER]).toEqual([]);
  });

  it('lists no permission twice for the same role', () => {
    for (const role of Object.values(Role)) {
      const list = ROLE_PERMISSIONS[role];
      expect(new Set(list).size).toBe(list.length);
    }
  });
});
