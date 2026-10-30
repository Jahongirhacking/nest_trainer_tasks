import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

/** `POST /tasks`. Same title rules as the project-nested create (Task 3). */
export class CreateRbacTaskDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(3, 100)
  @Matches(/\S/, { message: 'title must not be whitespace-only' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** The project the task belongs to (tasks always belong to a project). */
  @IsInt()
  @Min(1)
  projectId: number;
}
