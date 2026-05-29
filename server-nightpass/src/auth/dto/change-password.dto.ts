import { IsString, MinLength } from 'class-validator';
import { IsStrongPassword } from './password.constants';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  oldPassword!: string;

  @IsStrongPassword()
  newPassword!: string;
}
