import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Actualiza la zona (estado/ciudad) de un RP para el enrutamiento de efectivo. */
export class UpdateRpZoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;
}
