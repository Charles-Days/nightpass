import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RewardDiscountType, RewardKind } from '@prisma/client';

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

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  costNpp!: number;

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
}
