import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { VenueStaffRole } from '@prisma/client';

export class InviteStaffDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsEnum(VenueStaffRole)
  staffRole?: VenueStaffRole;
}
