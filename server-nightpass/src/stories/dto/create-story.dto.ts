import { StoryMediaType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStoryDto {
  @IsOptional()
  @IsUUID('all')
  venueId?: string;

  @IsOptional()
  @IsUUID('all')
  eventId?: string;

  @IsString()
  @MaxLength(500)
  mediaUrl!: string;

  @IsEnum(StoryMediaType)
  mediaType!: StoryMediaType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(15_000)
  durationMs?: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  caption?: string;
}
