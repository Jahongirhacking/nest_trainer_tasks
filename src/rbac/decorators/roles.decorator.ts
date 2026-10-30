import type { Role } from '../enums/role.enum.js';

/**
 * `@Roles(Role.ADMIN, Role.MANAGER)` - declares which roles may reach a route
 * (method decorator) or every route of a controller (class decorator).
 *
 * SCAFFOLDING: this placeholder records nothing, so RolesGuard sees no
 * metadata at all.
 *
 * TODO: Store the roles as metadata under ROLES_KEY (rbac.constants.ts) so it
 *       works on a class AND on a method. Decide what the metadata looks like
 *       when the decorator is called with no arguments (see README, "Metadata
 *       rules").
 */
export const Roles = (..._roles: Role[]): MethodDecorator & ClassDecorator => {
  return () => undefined;
};
