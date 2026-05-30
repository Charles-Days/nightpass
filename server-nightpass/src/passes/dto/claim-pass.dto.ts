import { IsString, MaxLength, MinLength } from 'class-validator';

export class ClaimPassDto {
  // Payload del QR emitido por el RP: `npc_<token>`.
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  code!: string;
}
