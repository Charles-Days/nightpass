import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().max(max).optional().or(z.literal(''));

/** Admin creates a promoter + its owner (by email). */
export const createPromoterSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  city: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  phone: optionalText(40),
  instagram: optionalText(120),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  bio: optionalText(500),
  ownerEmail: z.string().email('Email inválido'),
  ownerName: z.string().min(2, 'Mínimo 2 caracteres').max(80),
});
export type CreatePromoterInput = z.infer<typeof createPromoterSchema>;

/** Admin edits a promoter's profile (no owner, no status). */
export const adminUpdatePromoterSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  city: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  phone: optionalText(40),
  instagram: optionalText(120),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  bio: optionalText(500),
});
export type AdminUpdatePromoterInput = z.infer<typeof adminUpdatePromoterSchema>;
