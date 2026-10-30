import { IsInt, Min } from 'class-validator';

export class AssignTaskDto {
  @IsInt()
  @Min(1)
  assigneeId: number;
}
