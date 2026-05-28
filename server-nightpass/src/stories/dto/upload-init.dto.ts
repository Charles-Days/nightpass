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

export const STORY_ALLOWED_MIMES: Record<StoryMediaType, readonly string[]> = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  VIDEO: ['video/mp4', 'video/webm'],
};

export const STORY_MAX_BYTES: Record<StoryMediaType, number> = {
  IMAGE: 10 * 1024 * 1024,
  VIDEO: 200 * 1024 * 1024,
};

export class UploadInitDto {
  @IsOptional()
  @IsUUID('all')
  venueId?: string;

  @IsOptional()
  @IsUUID('all')
  eventId?: string;

  @IsEnum(StoryMediaType)
  mediaType!: StoryMediaType;

  @IsString()
  @MaxLength(80)
  contentType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024)
  sizeBytes!: number;
}
