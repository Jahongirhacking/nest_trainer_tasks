import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Authorizes a request by PERMISSIONS (the role -> permission matrix in
 * role-permissions.ts).
 *
 * SCAFFOLDING: denies everything (fails closed).
 *
 * TODO: Implement `canActivate` with the injected Reflector:
 *       - read the permissions declared with @Permissions() on the handler AND
 *         the controller, following README "Metadata rules" (note that the
 *         rule for permissions is different from the one for roles),
 *       - the caller's permissions are derived from `request.user.role`,
 *       - several permissions -> the caller needs ALL of them,
 *       - no metadata -> follow the policy documented in the README,
 *       - a missing principal or an unknown role is denied.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(_context: ExecutionContext): boolean | Promise<boolean> {
    return false;
  }
}
