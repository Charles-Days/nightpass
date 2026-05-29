import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Largo mínimo de contraseña — único punto de verdad para todos los DTOs y el frontend. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Reglas de contraseña reutilizables: largo + complejidad (mayúscula, minúscula, número).
 * Usar en cualquier campo de contraseña nueva (signup, change-password, reset-password).
 */
export function IsStrongPassword(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    }),
    MaxLength(PASSWORD_MAX_LENGTH),
    Matches(/[A-Z]/, { message: 'La contraseña debe incluir al menos una mayúscula' }),
    Matches(/[a-z]/, { message: 'La contraseña debe incluir al menos una minúscula' }),
    Matches(/[0-9]/, { message: 'La contraseña debe incluir al menos un número' }),
  );
}
