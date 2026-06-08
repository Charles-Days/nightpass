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
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CashFeeMode } from '@prisma/client';
import { TierPricePhaseDto } from './tier-price-phase.dto';

export class CreateTierDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsInt() @Min(0) priceCents!: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsInt() @Min(0) position?: number;
  // ─── Config de pago en efectivo (físico) ────────────────────────────────────
  // Override por-tier de la comisión NightPass en efectivo. Todos opcionales:
  // omitir => hereda del owner (Venue/Promoter) o del global.
  // Modo de aplicación de la comisión al precio en efectivo.
  // ADD => el cliente paga más (precio base + comisión); SUBTRACT (default) =>
  // el cliente paga el precio base y la org absorbe la comisión vía wallet.
  @IsOptional() @IsEnum(CashFeeMode) cashFeeMode?: CashFeeMode;
  // % de comisión en efectivo override (0..100). null/omitir => platformFeePct del owner.
  @IsOptional() @IsNumber() @Min(0) @Max(100) cashFeePctOverride?: number;
  // Exención de comisión override. null/omitir => cashCommissionExempt del owner.
  @IsOptional() @IsBoolean() cashExemptOverride?: boolean;
  // Precio en efectivo propio (centavos). Omitir => derivar del online (bruto − Stripe).
  @IsOptional() @IsInt() @Min(0) cashPriceCents?: number;
  // Subidas de precio programadas. `priceCents` es el early-bird base.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => TierPricePhaseDto)
  prices?: TierPricePhaseDto[];
}
