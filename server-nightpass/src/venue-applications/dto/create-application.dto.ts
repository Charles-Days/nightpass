import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class ApplicantDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}

class VenueDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class CreateApplicationDto {
  @ValidateNested()
  @Type(() => ApplicantDto)
  applicant!: ApplicantDto;

  @ValidateNested()
  @Type(() => VenueDto)
  venue!: VenueDto;
}
