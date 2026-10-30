import { IsEnum } from 'class-validator';
import { TaskStatus } from '../../enums/task-status.enum.js';

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
