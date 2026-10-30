import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { Role } from '../../enums/role.enum.js';

/** `POST /users` (ADMIN creates an account and chooses its role). */
export class CreateManagedUserDto {
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsString()
  @Length(12, 128)
  password: string;

  @IsEnum(Role)
  role: Role;
}
