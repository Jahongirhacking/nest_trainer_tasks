import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Authorizes a request by the caller's ROLE.
 *
 * SCAFFOLDING: denies everything (fails closed). Returning `false` makes Nest
 * answer 403 Forbidden.
 *
 * TODO: Implement `canActivate` using the injected Reflector:
 *       - read the roles declared with @Roles() for the handler AND the
 *         controller, following the rules in README "Metadata rules"
 *         (which level wins? are they combined?),
 *       - no metadata -> follow the policy documented in the README,
 *       - several roles -> the caller needs ANY of them,
 *       - the caller's role is `request.user.role` (set by the JWT strategy
 *         from the DATABASE). Never trust a role found in the token, body or
 *         query string,
 *       - a missing principal, or a role that is not a real `Role`, is denied.
 * TODO: This guard is about AUTHORIZATION only. It must not try to
 *       authenticate; JwtAuthGuard runs first and answers 401.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(_context: ExecutionContext): boolean | Promise<boolean> {
    return false;
  }
}
