import { EventStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateEventDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @Type(() => Date) @IsDate() startsAt?: Date;
  @IsOptional() @Type(() => Date) @IsDate() endsAt?: Date;
  @IsOptional() @IsString() @MaxLength(500) coverImageUrl?: string;
  @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
}
