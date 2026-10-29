import { Transform } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

/**
 * Payload for POST /auth/register.
 *
 * TODO: Add class-validator / class-transformer decorators for the rules in
 *       ASSIGNMENT.md ("DTO validation"). Think about which of the two fields
 *       may be trimmed and which must NEVER be modified.
 */
export class RegisterDto {
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;
  @IsString()
  password: string;
}
