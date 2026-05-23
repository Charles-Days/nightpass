import {
  IsLatitude,
  IsLongitude,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CheckinVenueDto {
  @IsUUID()
  venueId!: string;

  @IsString()
  @MaxLength(256)
  @Matches(/^np_checkin_/, {
    message: 'qrPayload must start with np_checkin_',
  })
  qrPayload!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}
