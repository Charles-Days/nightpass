import { IsEnum, IsIn, IsString, Matches, MaxLength } from 'class-validator';

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export class SignUploadDto {
  @IsString()
  @MaxLength(200)
  @Matches(/^[\w\-. ]+\.[A-Za-z0-9]{2,5}$/u, {
    message: 'Filename inválido',
  })
  filename!: string;

  @IsString()
  @IsIn(ALLOWED_UPLOAD_CONTENT_TYPES as unknown as string[])
  contentType!: (typeof ALLOWED_UPLOAD_CONTENT_TYPES)[number];

  @IsEnum(['venue', 'event', 'story'])
  kind!: 'venue' | 'event' | 'story';
}
