import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class ClaimReferralDto {
  @IsString()
  @Length(4, 16)
  code!: string;

  // Si el invitado vino por un link de evento, el referidor gana el doble.
  @IsOptional()
  @IsUUID()
  eventId?: string;
}
