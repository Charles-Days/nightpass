import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class BroadcastDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  body!: string;

  /** Ruta a abrir al hacer click (default '/'). */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  url?: string;
}
