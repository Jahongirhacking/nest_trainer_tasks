import { Injectable, NotImplementedException } from '@nestjs/common';
import { AuthService } from '../auth.service.js';
import type { SafeUser } from '../auth.constants.js';

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
export class LocalStrategy {
  constructor(private readonly authService: AuthService) {}

  validate(_email: string, _password: string): Promise<SafeUser> {
    throw new NotImplementedException('TODO: LocalStrategy.validate');
  }
}
