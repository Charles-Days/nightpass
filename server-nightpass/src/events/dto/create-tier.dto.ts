import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LoyaltyTier } from '@prisma/client';
import { TierPricePhaseDto } from './tier-price-phase.dto';

export class CreateTierDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsInt() @Min(0) priceCents!: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsInt() @Min(0) position?: number;
  @IsOptional() @IsEnum(LoyaltyTier) minLoyaltyTier?: LoyaltyTier;
  // Subidas de precio programadas. `priceCents` es el early-bird base.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => TierPricePhaseDto)
  prices?: TierPricePhaseDto[];
}
