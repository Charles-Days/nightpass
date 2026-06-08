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

/** Edición parcial de un punto de cobro — todos los campos opcionales. */
export class UpdatePickupPointDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) label?: string;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) mapsUrl?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PickupWindowDto)
  windows?: PickupWindowDto[];
  @IsOptional() @IsBoolean() isVenueDoor?: boolean;
}
