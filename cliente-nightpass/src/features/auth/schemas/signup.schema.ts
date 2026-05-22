import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(120, 'Máximo 120 caracteres'),
});

export type SignupInput = z.infer<typeof signupSchema>;
