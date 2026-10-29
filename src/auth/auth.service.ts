import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service.js';
import { type SafeUser } from './auth.constants.js';
import type { RegisterDto } from './dto/register.dto.js';

const skipSecretFields = (obj: Object, secretFieldNames: string[]) => {
  return Object.fromEntries(
    Object.entries(obj).filter((i) => !secretFieldNames.includes(i[0])),
  ) as SafeUser;
};

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
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /** Creates the account and returns the SAFE representation (no hash). */
  async register(_dto: RegisterDto): Promise<SafeUser> {
    const passwordHash = await argon2.hash(_dto.password, {
      type: argon2.argon2id,
    });
    const user = await this.usersService.create({
      email: _dto.email,
      passwordHash,
    });
    return skipSecretFields(user, ['passwordHash']) as SafeUser;
  }

  /**
   * Returns the safe user when the credentials are right, otherwise `null`.
   * Unknown email and wrong password must be indistinguishable to the caller.
   */
  async validateUser(
    _email: string,
    _password: string,
  ): Promise<SafeUser | null> {
    const user = await this.usersService.findByEmail(
      _email.trim().toLowerCase(),
    );
    if (!user || !(await argon2.verify(user.passwordHash, _password)))
      throw new UnauthorizedException('Login or password is incorrect');
    return skipSecretFields(user, ['passwordHash']) as SafeUser;
  }

  /** Issues the access token for an ALREADY authenticated user. */
  async login(_user: SafeUser): Promise<{ accessToken: string }> {
    const accessToken = this.jwtService.sign({ sub: _user.id });
    return {
      accessToken,
    };
  }
}
