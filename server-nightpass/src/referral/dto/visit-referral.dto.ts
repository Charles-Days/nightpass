import { IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class VisitReferralDto {
  @IsString()
  @Length(4, 16)
  code!: string;

  // visitorId first-party (cookie np_vid) que el front ya usa para métricas.
  // Sirve para no acreditar al mismo visitante más de una vez.
  @IsString()
  @MaxLength(128)
  visitorId!: string;

  // Si el link era por evento, el referido vale el doble.
  @IsOptional()
  @IsUUID()
  eventId?: string;
}
