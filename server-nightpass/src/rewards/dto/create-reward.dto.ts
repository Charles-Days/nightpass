import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RewardDiscountType, RewardKind } from '@prisma/client';

// BULK_PROMO: cada opción que el cliente puede elegir (botella, etc.).
export class RewardOptionInput {
  @IsString()
  @MaxLength(80)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class CreateRewardDto {
  // Exactamente uno: la recompensa pertenece a un venue o a un organizador.
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsUUID()
  promoterId?: string;

  @IsEnum(RewardKind)
  kind!: RewardKind;

  @IsString()
  @MaxLength(80)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  // Opcional: BULK_PROMO y PHYSICAL_BONUS_NPP son gratis (0). El servicio
  // exige >=1 para VENUE_PERK y TICKET_DISCOUNT.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  costNpp?: number;

  @IsOptional()
  @IsEnum(RewardDiscountType)
  discountType?: RewardDiscountType;

  // PERCENT: 1-100 · FIXED: centavos MXN.
  @IsOptional()
  @IsInt()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscountCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8760)
  expiresInH?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  // ── Alcance por evento (BULK_PROMO / PHYSICAL_BONUS_NPP) ───────────────────
  @IsOptional()
  @IsUUID()
  eventId?: string;

  // BULK_PROMO: tier que dispara la promo (opcional).
  @IsOptional()
  @IsUUID()
  tierId?: string;

  // BULK_PROMO: boletos a comprar para desbloquear.
  @IsOptional()
  @IsInt()
  @Min(2)
  minQuantity?: number;

  // PHYSICAL_BONUS_NPP: NPP a otorgar.
  @IsOptional()
  @IsInt()
  @Min(1)
  bonusNpp?: number;

  // BULK_PROMO: opciones a elegir (1-6).
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => RewardOptionInput)
  options?: RewardOptionInput[];
}
