import { EventStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEventDto {
  @IsUUID('all')
  venueId!: string;

  @IsString() @MinLength(2) @MaxLength(160)
  title!: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @Type(() => Date) @IsDate()
  startsAt!: Date;

  @Type(() => Date) @IsDate()
  endsAt!: Date;

  @IsOptional() @IsString() @MaxLength(500)
  coverImageUrl?: string;

  @IsOptional() @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional() @IsInt() @Min(1)
  capacity?: number;
}
