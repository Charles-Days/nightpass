import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListCatalogEventsQuery {
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsIn(['today', 'week', 'month']) date?: 'today' | 'week' | 'month';
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsString() @MaxLength(40) type?: string;
  @IsOptional() @Type(() => Number) @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @Min(1) @Max(50) limit: number = 20;
}
