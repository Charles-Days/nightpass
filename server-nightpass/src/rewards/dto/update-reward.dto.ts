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
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RewardDiscountType } from '@prisma/client';
import { RewardOptionInput } from './create-reward.dto';

// El dueño (venue/promoter) y el kind no se editan tras crear; solo el contenido.
export class UpdateRewardDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  costNpp?: number;

  @IsOptional()
  @IsEnum(RewardDiscountType)
  discountType?: RewardDiscountType;

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

  // BULK_PROMO: si se envía, reemplaza por completo el set de opciones (1-6).
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => RewardOptionInput)
  options?: RewardOptionInput[];

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
}
