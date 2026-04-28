import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(2, 'Mínimo 2 caracteres').max(160),
  description: z.string().max(2000).optional().or(z.literal('')),
  startsAt: z.string().min(1, 'Requerido'),
  endsAt: z.string().min(1, 'Requerido'),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  capacity: z.coerce.number().int().min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELED']).default('DRAFT'),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
