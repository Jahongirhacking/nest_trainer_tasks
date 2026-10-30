import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRbacTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
