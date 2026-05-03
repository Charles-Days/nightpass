import { IsUUID } from 'class-validator';

export class OnboardStripeDto {
  @IsUUID('all')
  venueId!: string;
}

export class StripeStatusQueryDto {
  @IsUUID('all')
  venueId!: string;
}
