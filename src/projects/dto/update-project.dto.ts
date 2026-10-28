import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Project } from '../entities/project.entity.js';

/**
 * Payload for PATCH /projects/:id.
 *
 * TODO: Declare optional `name` and `description` with the SAME rules as
 *       CreateProjectDto (consider reusing them instead of copying), and make
 *       sure an empty body `{}` is rejected.
 */
export class UpdateProjectDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: Project['name'];

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: Project['description'];
}
