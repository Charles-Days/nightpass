import { SetMetadata } from '@nestjs/common';

export const ALLOW_PASSWORD_CHANGE_PENDING = 'allowPasswordChangePending';

/**
 * Marca un endpoint como accesible aunque el usuario tenga
 * `mustChangePassword=true`. Solo lo necesitan las rutas del propio flujo de
 * cambio: ver el perfil, cambiar la contraseña y cerrar sesión. Cualquier otro
 * endpoint queda bloqueado por `JwtAuthGuard` hasta que el usuario cambie su
 * contraseña temporal — el enforcement vive en el backend, no solo en el
 * middleware del panel.
 */
export const AllowPasswordChangePending = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_PENDING, true);
