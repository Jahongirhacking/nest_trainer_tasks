import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { SafeUser } from '../auth.constants.js';

/**
 * Parameter decorator that returns the authenticated principal.
 *
 *   @CurrentUser()         -> the whole principal (`request.user`)
 *   @CurrentUser('email')  -> one property of the principal
 *
 * SCAFFOLDING: the factory below is a placeholder.
 *
 * TODO: Implement the factory (see current-user.decorator.spec.ts). It reads
 *       the principal the guard attached to the request, never anything the
 *       client can set through the body, query string or route.
 */
export const CurrentUser = createParamDecorator(
  (_property: keyof SafeUser | undefined, _context: ExecutionContext) => {
    const req = _context.switchToHttp().getRequest();
    return _property ? req.user?.[_property || ''] : req.user;
  },
);
