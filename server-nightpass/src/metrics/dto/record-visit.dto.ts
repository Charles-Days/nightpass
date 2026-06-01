import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

export class RecordVisitDto {
  // El visitorId lo provee el front (cookie np_vid o hash IP+UA). Acotamos a
  // 16-64 chars [a-zA-Z0-9_-] para que un id de miles de chars no infle las
  // claves/HLL de Redis. Trim defensivo antes de validar.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^[a-zA-Z0-9_\-]{16,64}$/)
  visitorId!: string;
}
