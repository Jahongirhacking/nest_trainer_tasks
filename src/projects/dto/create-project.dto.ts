import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Project } from '../entities/project.entity.js';

/**
 * Payload for POST /projects.
 *
 * TODO: Declare `name` and `description` and add class-validator decorators
 *       for the rules in ASSIGNMENT.md ("DTO validation"): required,
 *       trimmed, not blank, max 100 for name, max 500 for description.
 *       Reuse the approach from CreateTaskDto.
 */
export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: Project['name'];

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: Project['description'];
}
