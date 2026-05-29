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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LoyaltyTier } from '@prisma/client';
import { TierPricePhaseDto } from './tier-price-phase.dto';

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
  // Reemplaza por completo el calendario de subidas (replace-all). `undefined`
  // = no tocar; `[]` = borrar todas las fases.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => TierPricePhaseDto)
  prices?: TierPricePhaseDto[];
}
