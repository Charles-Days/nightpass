import { z } from 'zod';

export const EXPERIENCE_VALUES = ['0', '1-5', '6-20', '20+'] as const;
export const EVENT_TYPE_VALUES = [
  'electronica',
  'hiphop',
  'reggaeton',
  'live',
  'otro',
] as const;

export type ExperienceValue = (typeof EXPERIENCE_VALUES)[number];
export type EventTypeValue = (typeof EVENT_TYPE_VALUES)[number];

export const EXPERIENCE_LABELS: Record<ExperienceValue, string> = {
  '0': 'Sin eventos aún',
  '1-5': '1 a 5 eventos',
  '6-20': '6 a 20 eventos',
  '20+': 'Más de 20 eventos',
};

export const EVENT_TYPE_LABELS: Record<EventTypeValue, string> = {
  electronica: 'Electrónica',
  hiphop: 'Hip Hop',
  reggaeton: 'Reggaetón',
  live: 'En vivo',
  otro: 'Otro',
};

export const promoterApplicationSchema = z.object({
  applicant: z.object({
    name: z.string().min(2, 'Mínimo 2 caracteres').max(80),
    email: z.string().email('Email inválido'),
  }),
  promoter: z.object({
    name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
    city: z.string().min(2, 'Mínimo 2 caracteres').max(80),
    phone: z.string().max(40).optional().or(z.literal('')),
    instagram: z.string().max(80).optional().or(z.literal('')),
    website: z.string().max(200).optional().or(z.literal('')),
    experience: z.enum(EXPERIENCE_VALUES, {
      errorMap: () => ({ message: 'Selecciona tu experiencia' }),
    }),
    eventTypes: z
      .array(z.enum(EVENT_TYPE_VALUES))
      .min(1, 'Selecciona al menos un tipo de evento')
      .max(5, 'Máximo 5 tipos'),
    message: z.string().max(1000).optional().or(z.literal('')),
  }),
});

export type PromoterApplicationInput = z.infer<typeof promoterApplicationSchema>;
