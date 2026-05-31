import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class WhatsappGroupDto {
  @IsOptional() @IsString() @MaxLength(60)
  label?: string;

  @IsUrl({ require_protocol: true }) @MaxLength(500)
  url!: string;
}
