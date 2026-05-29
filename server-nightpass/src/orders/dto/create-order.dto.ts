import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID('all')
  tierId!: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}
