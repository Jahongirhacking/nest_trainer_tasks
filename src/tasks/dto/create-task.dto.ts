import { IsString } from 'class-validator';
import { Task } from '../entities/task.entity.js';

/**
 * Payload for POST /tasks.
 *
 * TODO: Declare the properties (title, description) and add class-validator
 *       decorators that enforce the rules in ASSIGNMENT.md.
 */
export class CreateTaskDto {
  @IsString()
  title: Task['title'];

  @IsString()
  description: Task['description'];
}
