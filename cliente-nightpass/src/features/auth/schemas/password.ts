import { z } from 'zod';

/** Largo mínimo de contraseña — debe coincidir con el backend (auth/dto/password.constants.ts). */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Campo zod reutilizable para cualquier contraseña nueva (signup, reset, change).
 * Largo + complejidad — espejo de `IsStrongPassword()` del backend.
 */
export const strongPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(PASSWORD_MAX_LENGTH, `Máximo ${PASSWORD_MAX_LENGTH} caracteres`)
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número');
