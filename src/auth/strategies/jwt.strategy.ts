import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service.js';
import {
  JWT_CONFIG,
  type JwtConfig,
  type JwtPayload,
} from '../auth.constants.js';
import type { SafeUser } from '../auth.constants.js';

/**
 * Passport "jwt" strategy (strategy name: "jwt").
 *
 * SCAFFOLDING: this class is not a Passport strategy yet, so it cannot
 * authenticate anyone.
 *
 * TODO: Make it a Passport strategy (PassportStrategy + passport-jwt) that:
 *       - takes the token ONLY from `Authorization: Bearer <token>`,
 *       - enforces expiration and verifies the signature with the secret from
 *         the JWT_CONFIG provider (algorithm pinned, no hard-coded secret),
 *       - validates issuer / audience when they are configured.
 * TODO: validate(payload) must reject a malformed `sub`, load the CURRENT user
 *       from PostgreSQL (a valid token for a deleted user must fail with 401)
 *       and return a SAFE principal: no passwordHash, and nothing copied from
 *       the token that you did not decide to trust.
 */
@Injectable()
export class JwtStrategy {
  constructor(
    @Inject(JWT_CONFIG) private readonly jwtConfig: JwtConfig,
    private readonly usersService: UsersService,
  ) {}

  validate(_payload: JwtPayload): Promise<SafeUser> {
    throw new NotImplementedException('TODO: JwtStrategy.validate');
  }
}
