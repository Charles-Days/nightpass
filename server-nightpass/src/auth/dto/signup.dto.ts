import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(10, { message: 'La contraseña debe tener al menos 10 caracteres' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'La contraseña debe incluir al menos una mayúscula' })
  @Matches(/[a-z]/, { message: 'La contraseña debe incluir al menos una minúscula' })
  @Matches(/[0-9]/, { message: 'La contraseña debe incluir al menos un número' })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
