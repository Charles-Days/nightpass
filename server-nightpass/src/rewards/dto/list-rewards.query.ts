import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class OwnerRewardsQuery {
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsUUID()
  promoterId?: string;
}

export class AvailableRewardsQuery {
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;
}
