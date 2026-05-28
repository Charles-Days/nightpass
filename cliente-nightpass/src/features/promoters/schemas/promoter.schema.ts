import { z } from 'zod';

export const updatePromoterSchema = z.object({
  bio: z.string().max(2000).optional().or(z.literal('')),
  logoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  instagram: z.string().max(120).optional().or(z.literal('')),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
});

export type UpdatePromoterInput = z.infer<typeof updatePromoterSchema>;
