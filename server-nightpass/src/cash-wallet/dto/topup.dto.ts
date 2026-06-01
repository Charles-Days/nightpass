import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class TopupDto {
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsUUID()
  promoterId?: string;

  @IsInt()
  @Min(1)
  amountCents!: number;
}
