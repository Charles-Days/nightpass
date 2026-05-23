import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  oldPassword!: string;

  @IsString()
  @MinLength(10, { message: 'La nueva contraseña debe tener al menos 10 caracteres' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'Debe incluir al menos una mayúscula' })
  @Matches(/[a-z]/, { message: 'Debe incluir al menos una minúscula' })
  @Matches(/[0-9]/, { message: 'Debe incluir al menos un número' })
  newPassword!: string;
}
