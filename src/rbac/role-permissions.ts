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
  [Role.ADMIN]: [],
  [Role.MANAGER]: [],
  [Role.USER]: [],
};
