import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListCatalogVenuesQuery {
  @IsOptional() @Type(() => Number) @IsNumber() lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() lng?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.1) @Max(50) radiusKm?: number;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsString() @MaxLength(40) category?: string;
  @IsOptional() @Type(() => Number) @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @Min(1) @Max(50) limit: number = 20;
}
