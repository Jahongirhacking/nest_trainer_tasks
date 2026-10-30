import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { LOCAL_STRATEGY, type SafeUser } from '../auth.constants.js';
import { AuthService } from '../auth.service.js';

/**
 * Passport "local" strategy (strategy name: "local", body field: `email`).
 *
 * SCAFFOLDING: this class is not a Passport strategy yet, so it cannot
 * authenticate anyone.
 *
 * TODO: Make it a Passport strategy (extend PassportStrategy with
 *       passport-local's Strategy) that reads `email` instead of `username`
 *       and delegates the credential check to AuthService.validateUser().
 * TODO: A failed check must become an UnauthorizedException with the SAME
 *       public message for every failure ("Invalid email or password").
 * TODO: Password verification does NOT belong in this class.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, LOCAL_STRATEGY) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

  async validate(_email: string, _password: string): Promise<SafeUser> {
    const user = await this.authService.validateUser(_email, _password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const { passwordHash: _passwordHash, ...safeUser } = user as SafeUser & {
      passwordHash?: string;
    };
    return safeUser;
  }
}
