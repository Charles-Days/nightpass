import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

class SubscriptionKeysDto {
  @IsString()
  @MinLength(1)
  p256dh!: string;

  @IsString()
  @MinLength(1)
  auth!: string;
}

export class SubscribeDto {
  @IsString()
  @MinLength(1)
  endpoint!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => SubscriptionKeysDto)
  keys!: SubscriptionKeysDto;

  // El navegador incluye expirationTime (number|null) en sub.toJSON(). Sin
  // declararlo, forbidNonWhitelisted lo rechaza con 400 y la suscripción nunca
  // se guarda. No lo usamos, solo lo toleramos.
  @IsOptional()
  expirationTime?: number | null;
}
