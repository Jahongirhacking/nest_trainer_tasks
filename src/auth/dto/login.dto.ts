import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches } from 'class-validator';

/**
 * Payload for POST /auth/login.
 *
 * TODO: Add the validation decorators (same email/password rules as
 *       registration, except that you must not reveal the password policy
 *       through login errors).
 * TODO: Passport's local strategy reads the raw request body BEFORE pipes run.
 *       Work out how a malformed login body ends up as HTTP 400 and not 401
 *       (see HINTS.md, level 3).
 */
export class LoginDto {
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;
  @IsString()
  @Matches(/\S/)
  password: string;
}
