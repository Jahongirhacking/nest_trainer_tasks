import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Task } from '../entities/task.entity.js';

/**
 * Payload for POST /tasks.
 *
 * TODO: Declare the properties (title, description) and add class-validator
 *       decorators that enforce the rules in ASSIGNMENT.md.
 */
export class CreateTaskDto {
  @IsDefined()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(3, 100)
  @Matches(/\S/, {
    message: 'title must not be whitespace-only',
  })
  title: Task['title'];

  @IsString()
  @ValidateIf((_, value) => value !== undefined)
  @MaxLength(500)
  description?: Task['description'];
}
