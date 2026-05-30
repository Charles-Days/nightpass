import { IsOptional, IsString, IsUUID, IsInt, Min, Max } from 'class-validator';

export class CreateOrderDto {
  @IsUUID('all')
  tierId!: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  quantity?: number;
}
