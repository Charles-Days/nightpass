import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32, 'Token invalido'),
    newPassword: z.string().min(8, 'Minimo 8 caracteres').max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
