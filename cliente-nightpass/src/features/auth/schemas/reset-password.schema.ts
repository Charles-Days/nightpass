import { z } from 'zod';
import { strongPassword } from './password';

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32, 'Token inválido'),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
