import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { LoyaltyTier } from '@prisma/client';

export class UpdateTierDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) name?: string;
  @IsOptional() @IsInt() @Min(0) priceCents?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsInt() @Min(0) position?: number;
  // Allow `null` to clear the gate; `undefined` to leave it untouched.
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsEnum(LoyaltyTier)
  minLoyaltyTier?: LoyaltyTier | null;
}
