import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveMapsDto {
  @IsString() @MinLength(5) @MaxLength(500) url!: string;
}
