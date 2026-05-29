import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Admin edit of a promoter's core profile. `slug` and `status` are not editable
 * here (status has dedicated suspend/reactivate endpoints, slug is immutable).
 * Empty string clears the optional contact fields; `undefined` leaves them as-is.
 */
export class AdminUpdatePromoterDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;
}
