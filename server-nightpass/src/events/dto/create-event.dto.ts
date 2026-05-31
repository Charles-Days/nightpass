import { EventStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { WhatsappGroupDto } from './whatsapp-group.dto';

export class CreateEventDto {
  @IsOptional() @IsUUID('all')
  venueId?: string;

  @IsOptional() @IsUUID('all')
  promoterId?: string;

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

  @IsOptional() @IsString() @MaxLength(500)
  flyerImageUrl?: string;

  @IsOptional() @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional() @IsInt() @Min(1)
  capacity?: number;

  @IsOptional() @IsString() @MaxLength(120)
  externalVenueName?: string;

  @IsOptional() @IsString() @MaxLength(200)
  externalVenueAddress?: string;

  @IsOptional() @IsString() @MaxLength(80)
  externalVenueCity?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90)
  externalVenueLat?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180)
  externalVenueLng?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => WhatsappGroupDto)
  whatsappGroups?: WhatsappGroupDto[];
}
