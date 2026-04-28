import { z } from 'zod';

export const applicationSchema = z.object({
  applicant: z.object({
    name: z.string().min(2, 'Mínimo 2 caracteres').max(80),
    email: z.string().email('Email inválido'),
  }),
  venue: z.object({
    name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
    city: z.string().min(2, 'Mínimo 2 caracteres').max(80),
    address: z.string().max(200).optional().or(z.literal('')),
    phone: z.string().max(40).optional().or(z.literal('')),
    message: z.string().max(1000).optional().or(z.literal('')),
  }),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
