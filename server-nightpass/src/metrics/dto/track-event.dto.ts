import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

/** Pasos del embudo que el front puede registrar. */
export const FUNNEL_STEPS = [
  'page_view',
  'view_event',
  'open_checkout',
  'view_signup',
  'signup_complete',
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export class TrackEventDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^[a-zA-Z0-9_\-]{16,64}$/)
  visitorId!: string;

  @IsIn(FUNNEL_STEPS)
  name!: FunnelStep;

  @IsString()
  @MaxLength(512)
  path!: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  referrer?: string;
}
