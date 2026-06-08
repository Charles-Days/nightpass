import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CashFeeMode } from '@prisma/client';
import { TierPricePhaseDto } from './tier-price-phase.dto';

export class UpdateTierDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) name?: string;
  @IsOptional() @IsInt() @Min(0) priceCents?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsInt() @Min(0) position?: number;
  // ─── Config de pago en efectivo (físico) — overrides por-tier ───────────────
  // Para los tres: `undefined` = no tocar; `null` = limpiar el override (volver
  // a heredar del owner/global). `@ValidateIf` deja pasar `null` saltándose el
  // validador de tipo.
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsEnum(CashFeeMode)
  cashFeeMode?: CashFeeMode | null;
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cashFeePctOverride?: number | null;
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsBoolean()
  cashExemptOverride?: boolean | null;
  // Precio en efectivo propio (centavos). undefined = no tocar; null = limpiar
  // (volver a derivar del online).
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsInt()
  @Min(0)
  cashPriceCents?: number | null;
  // Reemplaza por completo el calendario de subidas (replace-all). `undefined`
  // = no tocar; `[]` = borrar todas las fases.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => TierPricePhaseDto)
  prices?: TierPricePhaseDto[];
}
