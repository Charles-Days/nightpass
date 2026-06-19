'use client';

import * as React from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, MapPin, MessageCircle, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { ImageUploader } from '@/core/components/image-uploader';
import { clientFetch } from '@/core/lib/api/client-client';
import { resolveAndParseGoogleMapsUrl } from '@/features/venues/lib/parse-google-maps-url';
import { DateTimePicker } from '@/core/components/ui/datetime-picker';
import { CashPaymentSection } from './cash-payment-section';
import type { CatalogVenueSummary, Event } from '@/core/types/api';

// ---------------------------------------------------------------------------
// Schema — promoter-aware: location is either a catálogo venue or external.
// ---------------------------------------------------------------------------
const baseEventFields = z.object({
  title: z.string().min(2, 'Mínimo 2 caracteres').max(160),
  description: z.string().max(2000).optional().or(z.literal('')),
  startsAt: z.string().min(1, 'Requerido'),
  endsAt: z.string().min(1, 'Requerido'),
  coverImageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  flyerImageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  capacity: z.coerce.number().int().min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELED']).default('DRAFT'),
  whatsappGroups: z
    .array(
      z.object({
        label: z.string().max(60).optional().or(z.literal('')),
        url: z
          .string()
          .url('Link inválido')
          .or(z.literal('')),
      }),
    )
    .max(10)
    .optional(),
});

const venueLocationSchema = baseEventFields.extend({
  locationKind: z.literal('venue'),
  venueId: z.string().uuid('Selecciona un venue del catálogo'),
});

const externalLocationSchema = baseEventFields.extend({
  locationKind: z.literal('external'),
  externalVenueName: z.string().min(2, 'Requerido').max(160),
  externalVenueAddress: z.string().max(240).optional().or(z.literal('')),
  externalVenueCity: z.string().min(2, 'Requerido').max(80),
  externalVenueLat: z.coerce.number().nullable().optional(),
  externalVenueLng: z.coerce.number().nullable().optional(),
});

export const promoterEventSchema = z.discriminatedUnion('locationKind', [
  venueLocationSchema,
  externalLocationSchema,
]);

export type PromoterEventInput = z.infer<typeof promoterEventSchema>;

// ---------------------------------------------------------------------------
// Default values helper — used by parent pages to bootstrap edits.
// ---------------------------------------------------------------------------
export function toPromoterEventDefaults(event: Event): Partial<PromoterEventInput> {
  const base = {
    title: event.title,
    description: event.description ?? '',
    startsAt: event.startsAt.slice(0, 16),
    endsAt: event.endsAt.slice(0, 16),
    coverImageUrl: event.coverImageUrl ?? '',
    flyerImageUrl: event.flyerImageUrl ?? '',
    status: event.status,
    capacity: event.capacity ?? undefined,
    whatsappGroups: (event.whatsappGroups ?? []).map((g) => ({
      label: g.label ?? '',
      url: g.url,
    })),
  };
  if (event.venueId) {
    return {
      ...base,
      locationKind: 'venue' as const,
      venueId: event.venueId,
    };
  }
  return {
    ...base,
    locationKind: 'external' as const,
    externalVenueName: event.externalVenueName ?? '',
    externalVenueAddress: event.externalVenueAddress ?? '',
    externalVenueCity: event.externalVenueCity ?? '',
    externalVenueLat: event.externalVenueLat ?? undefined,
    externalVenueLng: event.externalVenueLng ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Venue picker — debounced search against /api/catalog/venues.
// ---------------------------------------------------------------------------
function VenuePicker({
  value,
  onChange,
  disabled,
}: {
  value: string | undefined;
  onChange: (venueId: string, venueLabel: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<CatalogVenueSummary[]>([]);
  const [selected, setSelected] = React.useState<CatalogVenueSummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  // Resolve initial selection if a venueId is provided externally.
  React.useEffect(() => {
    if (!value || selected?.id === value) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await clientFetch<{ items: CatalogVenueSummary[] }>(
          `/api/catalog/venues?limit=20`,
        );
        if (cancelled) return;
        const found = list.items.find((v) => v.id === value);
        if (found) setSelected(found);
      } catch {
        // ignore — picker stays empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, selected?.id]);

  // Debounced search.
  React.useEffect(() => {
    if (disabled) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const data = await clientFetch<{ items: CatalogVenueSummary[] }>(
          `/api/catalog/venues?search=${encodeURIComponent(query)}&limit=10`,
        );
        setResults(data.items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, disabled]);

  return (
    <div className="space-y-2">
      {selected ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/14 bg-white/[0.07] px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{selected.city}</p>
          </div>
          {!disabled ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelected(null);
                setQuery('');
              }}
            >
              Cambiar
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Busca un local del catálogo…"
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            disabled={disabled}
          />
          {open && (results.length > 0 || loading) ? (
            <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-white/14 bg-background shadow-xl">
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Buscando…
                </div>
              ) : (
                results.map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => {
                      setSelected(v);
                      setOpen(false);
                      onChange(v.id, v.name);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.09]"
                  >
                    <p className="font-medium">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.city}</p>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------
interface Props {
  promoterId: string;
  defaultValues?: Partial<PromoterEventInput>;
  eventId?: string;
  /** When editing, location switch is locked per backend constraint. */
  locationLocked?: boolean;
  onSubmit: (payload: Record<string, unknown>) => void | Promise<void>;
  isPending: boolean;
  submitLabel?: string;
  /** Renderiza la sección de métodos de pago al pie. Default true. El admin la
   *  pone en false porque ya la muestra en una card aparte. */
  showPayments?: boolean;
  /** Endpoint del selector de RPs para la sección de pago. Default los RPs del
   *  propio organizador. */
  rpListPath?: string | null;
}

export function EventFormPromoter({
  promoterId,
  defaultValues,
  eventId,
  locationLocked = false,
  onSubmit,
  isPending,
  submitLabel,
  showPayments = true,
  rpListPath = '/api/rp/promoter/mine',
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PromoterEventInput>({
    resolver: zodResolver(promoterEventSchema),
    defaultValues: {
      locationKind: 'venue',
      title: '',
      description: '',
      startsAt: '',
      endsAt: '',
      coverImageUrl: '',
      flyerImageUrl: '',
      status: 'DRAFT',
      whatsappGroups: [],
      ...defaultValues,
    } as PromoterEventInput,
  });

  const locationKind = watch('locationKind');

  const {
    fields: waFields,
    append: waAppend,
    remove: waRemove,
  } = useFieldArray({ control, name: 'whatsappGroups' });

  const submit = handleSubmit((values) => {
    // Limpia filas vacías y normaliza el shape { label?, url }.
    const whatsappGroups = (values.whatsappGroups ?? [])
      .map((g) => ({ label: g.label?.trim() || undefined, url: g.url.trim() }))
      .filter((g) => g.url.length > 0);

    // Common payload bits.
    const common = {
      title: values.title,
      description: values.description || undefined,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      coverImageUrl: values.coverImageUrl || undefined,
      flyerImageUrl: values.flyerImageUrl || undefined,
      status: values.status,
      capacity: values.capacity ?? undefined,
      whatsappGroups,
    };
    if (values.locationKind === 'venue') {
      void onSubmit({ ...common, promoterId, venueId: values.venueId });
    } else {
      void onSubmit({
        ...common,
        promoterId,
        externalVenueName: values.externalVenueName,
        externalVenueAddress: values.externalVenueAddress || undefined,
        externalVenueCity: values.externalVenueCity,
        externalVenueLat: values.externalVenueLat ?? undefined,
        externalVenueLng: values.externalVenueLng ?? undefined,
      });
    }
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Location switch. En edición, el TIPO (venue del catálogo vs externo) y la
          selección de venue quedan bloqueados (el UpdateEventDto no acepta cambiar
          venueId), pero los campos de un venue EXTERNO sí se pueden editar. */}
      <fieldset className="space-y-4 rounded-[18px] border border-white/14 bg-white/[0.035] p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
          ¿Dónde se realiza?
        </legend>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label
            className={`flex flex-1 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors ${
              locationKind === 'venue'
                ? 'border-primary/60 bg-primary/10'
                : 'border-white/14 hover:bg-white/[0.07]'
            }`}
          >
            <input
              type="radio"
              value="venue"
              {...register('locationKind')}
              className="mt-1"
              disabled={locationLocked}
            />
            <div>
              <p className="text-sm font-medium">Venue del catálogo</p>
              <p className="text-xs text-muted-foreground">
                Local registrado en NightPass.
              </p>
            </div>
          </label>
          <label
            className={`flex flex-1 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors ${
              locationKind === 'external'
                ? 'border-primary/60 bg-primary/10'
                : 'border-white/14 hover:bg-white/[0.07]'
            }`}
          >
            <input
              type="radio"
              value="external"
              {...register('locationKind')}
              className="mt-1"
              disabled={locationLocked}
            />
            <div>
              <p className="text-sm font-medium">Venue externo</p>
              <p className="text-xs text-muted-foreground">
                Espacio que no está en el catálogo.
              </p>
            </div>
          </label>
        </div>

        {locationKind === 'venue' ? (
          <Controller
            name="venueId"
            control={control}
            render={({ field, fieldState }) => (
              <Field
                label="Local"
                htmlFor="ev-venue-picker"
                error={fieldState.error?.message}
              >
                <VenuePicker
                  value={field.value}
                  onChange={(id) => field.onChange(id)}
                  disabled={locationLocked}
                />
              </Field>
            )}
          />
        ) : (
          <div className="space-y-4">
            {(() => {
              // Discriminated-union FieldErrors don't auto-narrow on `errors.xxx?.message`.
              // Cast once to a record of optional messages.
              const extErrors = errors as Partial<
                Record<
                  | 'externalVenueName'
                  | 'externalVenueAddress'
                  | 'externalVenueCity'
                  | 'externalVenueLat'
                  | 'externalVenueLng',
                  { message?: string } | undefined
                >
              >;
              return (
                <>
                  <Field
                    label="Nombre del lugar"
                    htmlFor="ext-name"
                    error={extErrors.externalVenueName?.message}
                  >
                    <Input
                      id="ext-name"
                      placeholder="Ej. Terraza Roof"
                      {...register('externalVenueName')}
                    />
                  </Field>
                  <Field
                    label="Dirección"
                    htmlFor="ext-address"
                    error={extErrors.externalVenueAddress?.message}
                  >
                    <Input
                      id="ext-address"
                      placeholder="Calle y número…"
                      {...register('externalVenueAddress')}
                    />
                  </Field>
                  <Field
                    label="Link de Google Maps o coordenadas"
                    htmlFor="ext-gmaps"
                  >
                    <Input
                      id="ext-gmaps"
                      placeholder='Pega link o "18.92206, -99.23555"'
                      onChange={async (e) => {
                        const value = e.target.value.trim();
                        if (!value || value.length < 5) return;
                        try {
                          const parsed = await resolveAndParseGoogleMapsUrl(value);
                          if (parsed) {
                            setValue('externalVenueLat', parsed.lat, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            setValue('externalVenueLng', parsed.lng, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            toast.success('Coordenadas extraídas');
                          } else if (/^https?:\/\//.test(value)) {
                            toast.error('No pude extraer coords del link');
                            console.warn('[gmaps] no coords from', value);
                          }
                        } catch (err) {
                          console.error('[gmaps] parse failed', err);
                          toast.error('Error al procesar el link');
                        }
                      }}
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Tip: short links de Maps redondean. Para máxima precisión, click derecho en el pin → copia coordenadas → pégalas aquí.
                    </p>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field
                      label="Ciudad"
                      htmlFor="ext-city"
                      error={extErrors.externalVenueCity?.message}
                    >
                      <Input
                        id="ext-city"
                        placeholder="CDMX"
                        {...register('externalVenueCity')}
                      />
                    </Field>
                    <Field
                      label="Latitud"
                      htmlFor="ext-lat"
                      error={extErrors.externalVenueLat?.message}
                    >
                      <Input
                        id="ext-lat"
                        type="number"
                        step="any"
                        placeholder="19.42"
                        {...register('externalVenueLat')}
                      />
                    </Field>
                    <Field
                      label="Longitud"
                      htmlFor="ext-lng"
                      error={extErrors.externalVenueLng?.message}
                    >
                      <Input
                        id="ext-lng"
                        type="number"
                        step="any"
                        placeholder="-99.13"
                        {...register('externalVenueLng')}
                      />
                    </Field>
                  </div>
                </>
              );
            })()}
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <MapPin className="mt-0.5 size-3" />
              Lat/Lng son opcionales — sin ellas el evento no aparece en el mapa.
            </p>
          </div>
        )}
      </fieldset>

      {/* Standard event fields */}
      <Field label="Título" htmlFor="ev-title" error={errors.title?.message}>
        <Input id="ev-title" placeholder="Nombre del evento" {...register('title')} />
      </Field>

      <Field label="Descripción" htmlFor="ev-description" error={errors.description?.message}>
        <textarea
          id="ev-description"
          rows={5}
          placeholder={'Soporta formato:\n## Título\n**negrita**, *cursiva*\n- lista\n> cita'}
          className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          {...register('description')}
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Soporta formato Markdown: <code className="text-foreground">**negrita**</code>,{' '}
          <code className="text-foreground">*cursiva*</code>,{' '}
          <code className="text-foreground">## título</code>,{' '}
          <code className="text-foreground">- listas</code>,{' '}
          <code className="text-foreground">&gt; cita</code>.
        </p>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Inicio" htmlFor="ev-starts-at" error={errors.startsAt?.message}>
          <Controller
            name="startsAt"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                id="ev-starts-at"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
        <Field label="Fin" htmlFor="ev-ends-at" error={errors.endsAt?.message}>
          <Controller
            name="endsAt"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                id="ev-ends-at"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Estado" htmlFor="ev-status" error={errors.status?.message}>
          <select
            id="ev-status"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            {...register('status')}
          >
            <option value="DRAFT">Borrador</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="CANCELED">Cancelado</option>
          </select>
        </Field>

        <Field label="Capacidad" htmlFor="ev-capacity" error={errors.capacity?.message}>
          <Input
            id="ev-capacity"
            type="number"
            min={1}
            placeholder="Sin límite"
            {...register('capacity')}
          />
        </Field>
      </div>

      <Controller
        name="coverImageUrl"
        control={control}
        render={({ field }) => (
          <ImageUploader
            kind="event"
            value={field.value || undefined}
            onChange={(url) => {
              setValue('coverImageUrl', url ?? '', { shouldDirty: true });
              field.onChange(url ?? '');
            }}
            label="Portada del evento"
            hint="Horizontal 16:9 — recomendado 1600×900 px. Se recorta a 16:9."
            aspect="video"
          />
        )}
      />

      <Controller
        name="flyerImageUrl"
        control={control}
        render={({ field }) => (
          <ImageUploader
            kind="event"
            value={field.value || undefined}
            onChange={(url) => {
              setValue('flyerImageUrl', url ?? '', { shouldDirty: true });
              field.onChange(url ?? '');
            }}
            label="Flyer del evento (vertical)"
            hint="Vertical 9:16 — recomendado 1080×1920 px. Se muestra completa."
            aspect="portrait"
          />
        )}
      />

      {/* Grupos de WhatsApp — varios links que verá el cliente en el evento. */}
      <fieldset className="space-y-3 rounded-[18px] border border-white/14 bg-white/[0.035] p-4">
        <legend className="flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
          <MessageCircle className="size-3.5" />
          Grupos de WhatsApp
        </legend>
        <p className="px-1 text-xs text-muted-foreground">
          Agrega uno o varios links de grupos. Aparecerán en la información del
          evento para que los asistentes se unan.
        </p>

        {waFields.map((f, i) => (
          <div key={f.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <Input
              placeholder="Nombre (ej. General, VIP)"
              className="sm:w-44"
              {...register(`whatsappGroups.${i}.label` as const)}
            />
            <div className="flex-1">
              <Input
                placeholder="https://chat.whatsapp.com/…"
                {...register(`whatsappGroups.${i}.url` as const)}
              />
              {errors.whatsappGroups?.[i]?.url && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.whatsappGroups[i]?.url?.message}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => waRemove(i)}
              className="shrink-0 rounded-md border-white/18 bg-transparent text-white/70 hover:bg-white/[0.09]"
              aria-label="Quitar grupo"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        {waFields.length < 10 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => waAppend({ label: '', url: '' })}
            className="rounded-full border-white/18 bg-transparent text-sm text-white/80 hover:bg-white/[0.09]"
          >
            <Plus className="mr-1.5 size-4" />
            Agregar grupo
          </Button>
        )}
      </fieldset>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
        <Button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-6 font-semibold text-white shadow-lg shadow-primary/30 sm:w-auto"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? 'Guardando…' : submitLabel ?? (eventId ? 'Guardar cambios' : 'Crear evento')}
        </Button>
      </div>

      {eventId && showPayments ? (
        <div className="space-y-3 border-t border-white/10 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Métodos de pago
          </p>
          <CashPaymentSection eventId={eventId} rpListPath={rpListPath} />
        </div>
      ) : null}
    </form>
  );
}
