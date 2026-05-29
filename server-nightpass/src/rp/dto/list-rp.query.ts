import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MaxLength } from 'class-validator';

export class ListRpQuery {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;

  @IsOptional()
  @IsUUID()
  promoterId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
