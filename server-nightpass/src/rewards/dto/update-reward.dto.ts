import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RewardDiscountType } from '@prisma/client';

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
}
