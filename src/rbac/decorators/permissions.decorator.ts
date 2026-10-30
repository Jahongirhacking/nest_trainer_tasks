import type { Permission } from '../enums/permission.enum.js';

/**
 * `@Permissions(Permission.TASKS_READ, Permission.TASKS_DELETE)` - declares
 * which permissions a caller needs (ALL of them) for a route or a controller.
 *
 * SCAFFOLDING: this placeholder records nothing.
 *
 * TODO: Store the permissions as metadata under PERMISSIONS_KEY
 *       (rbac.constants.ts), usable on classes and methods.
 */
export const Permissions = (
  ..._permissions: Permission[]
): MethodDecorator & ClassDecorator => {
  return () => undefined;
};
