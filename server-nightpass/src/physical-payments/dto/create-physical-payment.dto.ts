import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePhysicalPaymentDto {
  @IsUUID()
  tierId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  // Ubicación del cliente — se pide la primera vez (si no la tenemos del ranking)
  // y se reutiliza. Sirve para enrutar la solicitud al RP de su zona.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}
