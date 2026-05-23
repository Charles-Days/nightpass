import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { LocationPingSource } from '@prisma/client';

export class RecordLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyM?: number;

  @IsEnum(LocationPingSource)
  source!: LocationPingSource;
}
