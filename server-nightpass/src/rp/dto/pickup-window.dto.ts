import { IsInt, IsOptional, IsString, Matches, Max, Min, ValidateIf } from 'class-validator';

/**
 * Ventana horaria de atención de un punto de cobro. `dow` (día de la semana,
 * 0=domingo..6=sábado) opcional: null/omitir => aplica todos los días.
 * `@ValidateIf` deja pasar `null` saltándose el validador de tipo (igual que
 * los overrides de update-tier.dto.ts).
 */
export class PickupWindowDto {
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dow?: number | null;

  // Hora de inicio "HH:mm" (24h).
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  start!: string;

  // Hora de fin "HH:mm" (24h).
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  end!: string;
}
