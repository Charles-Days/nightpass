import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PickupWindowDto } from './pickup-window.dto';

/**
 * Alta de un punto de cobro del RP. Si no se mandan lat/lng se derivan del
 * `mapsUrl` (link de Google Maps) en el service vía `resolveMapsCoords`.
 */
export class CreatePickupPointDto {
  @IsString() @MinLength(2) @MaxLength(80) label!: string;
  // Referencia en texto de dónde estará exactamente el RP (el pin es aproximado).
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
  // Link de Google Maps (o "lat,lng" pegado a mano). Fuente para derivar coords.
  @IsOptional() @IsString() @MaxLength(500) mapsUrl?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  // Ventanas horarias de atención.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PickupWindowDto)
  windows?: PickupWindowDto[];
  // El punto es la puerta del venue (se ordena al final en la lista de cercanía).
  @IsOptional() @IsBoolean() isVenueDoor?: boolean;
}
