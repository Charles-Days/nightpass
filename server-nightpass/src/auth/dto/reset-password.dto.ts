import { IsString, MinLength, MaxLength } from 'class-validator';
import { IsStrongPassword } from './password.constants';

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;

  @IsStrongPassword()
  newPassword!: string;
}
