import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class InvitePromoterStaffDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}
