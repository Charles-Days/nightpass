import { z } from 'zod';
import { strongPassword } from './password';

export const signupSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  email: z.string().email('Email inválido'),
  password: strongPassword,
});

export type SignupInput = z.infer<typeof signupSchema>;
