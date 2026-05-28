import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const EXPERIENCE_VALUES = ['0', '1-5', '6-20', '20+'] as const;
const EVENT_TYPE_VALUES = [
  'electronica',
  'hiphop',
  'reggaeton',
  'live',
  'otro',
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_VALUES)[number];
export type EventTypeTag = (typeof EVENT_TYPE_VALUES)[number];

class PromoterApplicantDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}

class PromoterDataDto {
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
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsString()
  @IsIn(EXPERIENCE_VALUES as unknown as string[])
  experience!: ExperienceLevel;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsIn(EVENT_TYPE_VALUES as unknown as string[], { each: true })
  eventTypes!: EventTypeTag[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class CreatePromoterApplicationDto {
  @ValidateNested()
  @Type(() => PromoterApplicantDto)
  applicant!: PromoterApplicantDto;

  @ValidateNested()
  @Type(() => PromoterDataDto)
  promoter!: PromoterDataDto;
}
