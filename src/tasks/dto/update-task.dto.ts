import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Task } from '../entities/task.entity.js';

/**
 * Payload for PATCH /tasks/:id.
 *
 * TODO: Declare the properties (title, description, completed), make them
 *       optional, and add class-validator decorators.
 * TODO: Make sure an empty body `{}` is rejected.
 */
export class UpdateTaskDto {
  @IsString()
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(3, 100)
  @Matches(/\S/, {
    message: 'title must not be whitespace-only',
  })
  title?: Task['title'];

  @IsString()
  @ValidateIf((_, value) => value !== undefined)
  @MaxLength(500)
  description?: Task['description'];

  @IsBoolean()
  @ValidateIf((_, value) => value !== undefined)
  completed?: Task['completed'];
}
