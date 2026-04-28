import { IsEnum, IsString, MaxLength } from 'class-validator';

export class SignUploadDto {
  @IsString()
  @MaxLength(200)
  filename!: string;

  @IsString()
  @MaxLength(100)
  contentType!: string;

  @IsEnum(['venue', 'event', 'story'])
  kind!: 'venue' | 'event' | 'story';
}
