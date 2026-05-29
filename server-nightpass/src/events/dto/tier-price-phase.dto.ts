import { IsInt, Max, Min } from 'class-validator';

/** Una subida de precio programada dentro de un tier. */
export class TierPricePhaseDto {
  @IsInt() @Min(0) priceCents!: number;
  // Cuántos días naturales antes del evento se activa este precio.
  @IsInt() @Min(0) @Max(365) daysBeforeEvent!: number;
}
