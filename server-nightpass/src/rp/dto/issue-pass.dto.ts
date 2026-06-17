import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PassClaimChannel } from '@prisma/client';

export class IssuePassDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  tierId!: string;

  // Cómo se comparte el vale. QR (presencial, expira en 10 min) por defecto;
  // LINK (a distancia) vive hasta una semana después del evento.
  @IsOptional()
  @IsEnum(PassClaimChannel)
  channel?: PassClaimChannel;
}
