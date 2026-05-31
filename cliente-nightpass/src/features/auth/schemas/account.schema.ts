import { z } from 'zod';

export const profileNameSchema = z.object({
  name: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(80, 'Máximo 80 caracteres'),
});
export type ProfileNameInput = z.infer<typeof profileNameSchema>;

export const emailChangeSchema = z.object({
  newEmail: z.string().email('Correo inválido'),
  currentPassword: z.string().min(1, 'Requerido'),
});
export type EmailChangeInput = z.infer<typeof emailChangeSchema>;
