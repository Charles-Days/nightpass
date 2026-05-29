import { Type } from 'class-transformer';
import { IsObject, IsString, MinLength, ValidateNested } from 'class-validator';

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
}
