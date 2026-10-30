import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../enums/role.enum.js';

/** `PATCH /users/:id`. Changing `role` is a role-management operation. */
export class UpdateManagedUserDto {
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
