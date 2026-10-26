import { IsBoolean, IsOptional, IsString } from 'class-validator';
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
  @IsOptional()
  title?: Task['title'];

  @IsString()
  @IsOptional()
  description?: Task['description'];

  @IsBoolean()
  @IsOptional()
  completed?: Task['completed'];
}
