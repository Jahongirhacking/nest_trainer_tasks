import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** `PATCH /tasks/:id` - content only. Status and assignee have their own routes. */
export class UpdateRbacTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
