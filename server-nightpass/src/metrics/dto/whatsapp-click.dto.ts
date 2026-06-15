import { Transform } from 'class-transformer';
import { IsString, IsUUID, Matches } from 'class-validator';

// Clic al botón "Unirse al grupo de WhatsApp" de un evento. El visitorId es el
// mismo que usa el tracking de visitas (cookie np_vid o hash IP+UA) — así un
// dispositivo cuenta una sola vez aunque toque el botón varias veces (dedup por
// SET en Redis).
export class WhatsappClickDto {
  @IsUUID()
  eventId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^[a-zA-Z0-9_\-]{16,64}$/)
  visitorId!: string;
}
