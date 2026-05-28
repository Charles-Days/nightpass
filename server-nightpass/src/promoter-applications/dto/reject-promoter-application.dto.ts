import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectPromoterApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
