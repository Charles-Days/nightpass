import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsStrongPassword } from './password.constants';

export class SignupDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsStrongPassword()
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
