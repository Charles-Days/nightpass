import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsBoolean()
  rankingOptIn?: boolean;
}
