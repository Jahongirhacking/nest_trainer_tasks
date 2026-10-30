import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../enums/permission.enum.js';
import { PERMISSIONS_KEY } from '../rbac.constants.js';
import { SafeUser } from '../rbac.types.js';
import { ROLE_PERMISSIONS } from '../role-permissions.js';

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
    const user = _context.switchToHttp().getRequest()?.user as SafeUser;
    if (!user) throw new UnauthorizedException();
    const requiredPermissions: Permission[] = this.reflector.getAllAndOverride(
      PERMISSIONS_KEY,
      [_context.getHandler(), _context.getClass()],
    );
    if (!requiredPermissions || !requiredPermissions?.length) return true;
    const userPermissions = ROLE_PERMISSIONS?.[user.role];
    if (requiredPermissions.some((p) => !userPermissions.includes(p)))
      throw new ForbiddenException();
    return true;
  }
}
