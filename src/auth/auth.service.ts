import { Injectable, NotImplementedException } from '@nestjs/common';
import type { SafeUser } from './auth.constants.js';
import type { RegisterDto } from './dto/register.dto.js';

/**
 * Coordinates authentication. User persistence stays in UsersService.
 *
 * NOTE: every body below is TEMPORARY SCAFFOLDING (HTTP 501). Keep the method
 * names and parameter order: the tests depend on them.
 *
 * The AuthService unit test provides exactly these collaborators: UsersService,
 * JwtService and the JWT_CONFIG token. Hashing helpers must therefore be plain
 * functions/constants you call directly, not extra injected providers.
 *
 * TODO: Inject what you need (constructor injection).
 * TODO: Hash passwords with a maintained algorithm (Argon2id is installed) and
 *       verify them with the library's verify function. Never log them.
 * TODO: Normalize the email HERE as well: the local strategy never goes through
 *       the DTO, so this layer cannot assume the DTO ran.
 */
@Injectable()
export class AuthService {
  /** Creates the account and returns the SAFE representation (no hash). */
  register(_dto: RegisterDto): Promise<SafeUser> {
    throw new NotImplementedException('TODO: AuthService.register');
  }

  /**
   * Returns the safe user when the credentials are right, otherwise `null`.
   * Unknown email and wrong password must be indistinguishable to the caller.
   */
  validateUser(_email: string, _password: string): Promise<SafeUser | null> {
    throw new NotImplementedException('TODO: AuthService.validateUser');
  }

  /** Issues the access token for an ALREADY authenticated user. */
  login(_user: SafeUser): Promise<{ accessToken: string }> {
    throw new NotImplementedException('TODO: AuthService.login');
  }
}
