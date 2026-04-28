import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateTierDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsInt() @Min(0) priceCents!: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsInt() @Min(0) position?: number;
}
