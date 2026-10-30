import { Permission } from './enums/permission.enum.js';
import { Role } from './enums/role.enum.js';

/**
 * The role -> permission matrix (see "Role and permission matrix" in the
 * README). It is the single source of truth PermissionsGuard consults.
 *
 * TODO: Fill every role with the permissions the README matrix grants.
 *       Think about whether ADMIN should list every permission explicitly or
 *       derive it from the enum, and what happens when a new Permission is
 *       added later (role-permissions.spec.ts has a test for that).
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  [Role.ADMIN]: [
    Permission.USERS_READ,
    Permission.USERS_CREATE,
    Permission.USERS_UPDATE,
    Permission.USERS_DELETE,
    Permission.TASKS_READ,
    Permission.TASKS_CREATE,
    Permission.TASKS_UPDATE,
    Permission.TASKS_DELETE,
    Permission.TASKS_ASSIGN,
    Permission.ROLES_MANAGE,
  ],
  [Role.MANAGER]: [
    Permission.USERS_READ,
    Permission.TASKS_READ,
    Permission.TASKS_CREATE,
    Permission.TASKS_UPDATE,
    Permission.TASKS_ASSIGN,
  ],
  [Role.USER]: [],
};
