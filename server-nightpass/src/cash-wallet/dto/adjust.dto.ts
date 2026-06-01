import { IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdjustDto {
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsUUID()
  promoterId?: string;

  @IsInt()
  amountCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
