import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service.js';
import type { SafeUser } from '../auth.constants.js';
import {
  JWT_CONFIG,
  JWT_STRATEGY,
  type JwtConfig,
  type JwtPayload,
} from '../auth.constants.js';

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
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY) {
  constructor(
    @Inject(JWT_CONFIG) private readonly jwtConfig: JwtConfig,
    private readonly usersService: UsersService,
  ) {
    const bearer = ExtractJwt.fromAuthHeaderAsBearerToken();

    const requireExp = (req: Request): string | null => {
      const token = bearer(req);
      if (!token) return null;
      try {
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
        );
        return typeof payload?.exp === 'number' ? token : null;
      } catch {
        return null;
      }
    };

    super({
      jwtFromRequest: requireExp,
      secretOrKey: jwtConfig.secret,
      audience: jwtConfig.audience,
      issuer: jwtConfig.issuer,
      ignoreExpiration: false,
      algorithms: ['HS256'],
    });
  }

  async validate(_payload: JwtPayload): Promise<SafeUser> {
    const id =
      typeof _payload.sub === 'string' && /^[1-9]\d*$/.test(_payload.sub)
        ? Number(_payload.sub)
        : _payload.sub;

    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0)
      throw new UnauthorizedException();
    const user = await this.usersService.findById(Number(_payload.sub));
    if (!user) throw new UnauthorizedException();
    return Object.fromEntries(
      Object.entries(user).filter((i) => i[0] !== 'passwordHash'),
    ) as SafeUser;
  }
}
