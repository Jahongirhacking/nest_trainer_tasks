import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../rbac.types.js';

/**
 * Parameter decorator returning the authenticated principal of THIS module:
 *
 *   @CurrentUser()        -> the whole AuthenticatedUser
 *   @CurrentUser('role')  -> one property of it
 *
 * It is typed with `role`, unlike the Task 4 decorator in src/auth.
 *
 * SCAFFOLDING: the factory below is a placeholder that returns nothing.
 *
 * TODO: Implement the factory (see current-user.decorator.spec.ts). It may only
 *       read what the authentication guard attached to the request.
 */
export const CurrentUser = createParamDecorator(
  (_property: keyof AuthenticatedUser | undefined, _context: ExecutionContext) =>
    undefined,
);
