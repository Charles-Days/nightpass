import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Actualiza zona (estado/ciudad) + teléfono de contacto de un RP. */
export class UpdateRpZoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}
