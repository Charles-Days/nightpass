import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendTestDto {
  @IsString() @MinLength(8) @MaxLength(20)
  to!: string;

  // Si mandas templateName → envía plantilla (mensaje iniciado por negocio).
  @IsOptional() @IsString() @MaxLength(120)
  templateName?: string;

  @IsOptional() @IsString() @MaxLength(10)
  languageCode?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true })
  params?: string[];

  // Si mandas text (sin templateName) → texto libre (solo dentro de ventana 24h).
  @IsOptional() @IsString() @MaxLength(1000)
  text?: string;
}
