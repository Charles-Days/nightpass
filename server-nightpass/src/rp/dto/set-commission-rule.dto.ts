import { RpCommissionType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SetCommissionRuleDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsEnum(RpCommissionType)
  type!: RpCommissionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  nTickets?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rewardCents?: number;

  @IsOptional()
  @IsString()
  currency: string = 'MXN';

  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;
}
