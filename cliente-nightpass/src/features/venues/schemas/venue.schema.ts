import { z } from 'zod';

export const venueSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  city: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  address: z.string().max(200).optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  capacity: z.coerce.number().int().positive().nullable().optional(),
  priceFromCents: z.coerce.number().int().nonnegative().nullable().optional(),
  currency: z.string().optional().or(z.literal('')),
  latitude: z.coerce.number().nullable().optional(),
  longitude: z.coerce.number().nullable().optional(),
  coverImageUrl: z.string().url('URL inválida').optional().or(z.literal('')).nullable(),
  categories: z.array(z.string()).optional(),
  openHours: z.record(z.any()).nullable().optional(),
  menuUrl: z.string().url('URL inválida').optional().or(z.literal('')).nullable(),
  musicTypes: z.array(z.string()).optional(),
  socialLinks: z.record(z.any()).nullable().optional(),
  dressCode: z.string().optional().or(z.literal('')).nullable(),
  minAge: z.coerce.number().int().positive().nullable().optional(),
  ownerUserId: z.string().uuid('ID de usuario inválido').optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  images: z.array(z.string()).optional(),
});

export type VenueInput = z.infer<typeof venueSchema>;
export const updateVenueSchema = venueSchema.partial();
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
