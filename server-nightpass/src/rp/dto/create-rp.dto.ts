import { RpCommissionType } from '@prisma/client';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, MinLength, Min } from 'class-validator';

export class CreateRpDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;

  // Zona del RP — para enrutar solicitudes de pago en efectivo de su ciudad/estado.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsUUID()
  promoterId?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsEnum(RpCommissionType)
  commissionType?: RpCommissionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  nTickets?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rewardCents?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;
}
