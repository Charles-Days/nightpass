import { IsEmail, IsString, MinLength } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail({}, { message: 'Correo inválido' })
  newEmail!: string;

  @IsString()
  @MinLength(1, { message: 'Requerido' })
  currentPassword!: string;
}
