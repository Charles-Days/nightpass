import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class AdminGeneratePassDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  tierId!: string;

  @IsOptional()
  @IsString()
  rpCode?: string;

  @IsOptional()
  @IsBoolean()
  comp?: boolean;
}
