'use client';

import * as React from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Loader2, Plus, Globe, Instagram, Facebook, Music,
  Clock, Info, Camera, BookOpen, X, Upload, Eye
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { Textarea } from '@/core/components/ui/textarea';
import { CollapsibleCard } from '@/core/components/ui/collapsible-card';
import { toast } from 'sonner';
import { venueSchema, type VenueInput } from '../schemas/venue.schema';
import { uploadFile } from '@/core/lib/upload';
import { useUpdateVenueSection } from '../hooks/use-update-venue-section';
import { resolveAndParseGoogleMapsUrl } from '../lib/parse-google-maps-url';

// ---------------------------------------------------------------------------
// Field groups — used to derive hasUnsavedChanges per section from dirtyFields
// ---------------------------------------------------------------------------
const BASIC_FIELDS: (keyof VenueInput)[] = [
  'name', 'city', 'address', 'phone', 'description', 'latitude', 'longitude', 'googleMapsUrl',
];

const CONCEPT_FIELDS: (keyof VenueInput)[] = [
  'capacity', 'minAge', 'dressCode', 'musicTypes', 'categories',
];

const HOURS_FIELDS: (keyof VenueInput)[] = ['openHours'];

const GALLERY_FIELDS: (keyof VenueInput)[] = ['images'];

const COVER_FIELDS: (keyof VenueInput)[] = [
  'coverImageUrl', 'menuUrl', 'socialLinks',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MUSIC_TYPES = [
  'Reggaeton', 'Electrónica', 'Pop', 'Hip-Hop', 'Techno',
  'House', 'Rock', 'Latina', 'Comercial',
];

function isDirtySection(
  dirtyFields: Partial<Record<keyof VenueInput, unknown>>,
  fields: (keyof VenueInput)[],
): boolean {
  return fields.some((f) => !!dirtyFields[f]);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  initialData?: Partial<VenueInput>;
  onSubmit: (data: VenueInput) => void;
  isPending: boolean;
  submitLabel?: string;
  mode?: 'create' | 'edit';
  venueId?: string;
}

// ---------------------------------------------------------------------------
// SaveSectionButton — small pill rendered in rightSlot
// ---------------------------------------------------------------------------
function SaveSectionButton({
  onClick,
  isPending,
}: {
  onClick: () => void;
  isPending: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {isPending ? <Loader2 className="size-3 animate-spin" /> : null}
      Guardar
    </button>
  );
}

// ---------------------------------------------------------------------------
// VenueForm
// ---------------------------------------------------------------------------
export function VenueForm({
  initialData,
  onSubmit,
  isPending,
  submitLabel = 'Guardar',
  mode = 'create',
  venueId,
}: Props) {
  const isEdit = mode === 'edit';

  const [isUploadingCover, setIsUploadingCover] = React.useState(false);
  const [isUploadingImages, setIsUploadingImages] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const imagesInputRef = React.useRef<HTMLInputElement>(null);

  // Only instantiate the section-save hook when in edit mode
  const sectionMutation = useUpdateVenueSection(venueId ?? '');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<VenueInput>({
    resolver: zodResolver(venueSchema),
    defaultValues: {
      name: '',
      city: '',
      address: '',
      phone: '',
      description: '',
      musicTypes: [],
      categories: [],
      images: [],
      ...initialData,
      openHours: initialData?.openHours || {
        monday: { open: '22:00', close: '05:00', closed: false },
        tuesday: { open: '22:00', close: '05:00', closed: true },
        wednesday: { open: '22:00', close: '05:00', closed: true },
        thursday: { open: '22:00', close: '05:00', closed: false },
        friday: { open: '22:00', close: '05:00', closed: false },
        saturday: { open: '22:00', close: '05:00', closed: false },
        sunday: { open: '22:00', close: '05:00', closed: true },
      },
      socialLinks: initialData?.socialLinks || {
        instagram: '',
        facebook: '',
        tiktok: '',
      },
    },
  });

  const selectedMusic = watch('musicTypes') || [];
  const openHours = watch('openHours') || {};
  const images = watch('images') || [];
  const coverImageUrl = watch('coverImageUrl');

  const toggleMusic = (genre: string) => {
    const current = [...selectedMusic];
    const index = current.indexOf(genre);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(genre);
    }
    setValue('musicTypes', current, { shouldDirty: true });
  };

  const handleHourChange = (day: string, field: string, value: string | boolean) => {
    const current = { ...openHours };
    current[day] = { ...current[day], [field]: value };
    setValue('openHours', current, { shouldDirty: true, shouldValidate: true });
  };

  const onCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingCover(true);
      const url = await uploadFile(file, 'venue');
      setValue('coverImageUrl', url, { shouldDirty: true });
      toast.success('Imagen de portada subida');
    } catch {
      toast.error('Error al subir la imagen');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const onImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      setIsUploadingImages(true);
      const urls = await Promise.all(files.map((f) => uploadFile(f, 'venue')));
      setValue('images', [...images, ...urls], { shouldDirty: true });
      toast.success(`${urls.length} fotos añadidas`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al subir algunas imágenes';
      console.error('[venue gallery upload]', err);
      toast.error(msg);
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setValue('images', newImages, { shouldDirty: true });
  };

  // -------------------------------------------------------------------------
  // Section-level save — picks only the fields belonging to the section,
  // then resets dirty state after a successful mutation.
  // -------------------------------------------------------------------------
  const saveSection = (fields: (keyof VenueInput)[]) => {
    if (!isEdit || !venueId) return;

    const currentValues = watch();
    const partial: Partial<VenueInput> = {};
    for (const f of fields) {
      if (currentValues[f] !== undefined) {
        (partial as Record<string, unknown>)[f] = currentValues[f];
      }
    }

    sectionMutation.mutate(partial, {
      onSuccess: () => {
        // Clear dirty state while keeping current values
        reset(currentValues, { keepValues: true, keepDirty: false });
      },
    });
  };

  // -------------------------------------------------------------------------
  // Dirty flags per section
  // -------------------------------------------------------------------------
  const dirtyBasic = isDirtySection(dirtyFields, BASIC_FIELDS);
  const dirtyConcept = isDirtySection(dirtyFields, CONCEPT_FIELDS);
  const dirtyHours = isDirtySection(dirtyFields, HOURS_FIELDS);
  const dirtyGallery = isDirtySection(dirtyFields, GALLERY_FIELDS);
  const dirtyCover = isDirtySection(dirtyFields, COVER_FIELDS);

  // -------------------------------------------------------------------------
  // rightSlot builders
  // -------------------------------------------------------------------------
  const makeSaveSlot = (fields: (keyof VenueInput)[]) =>
    isEdit ? (
      <SaveSectionButton
        onClick={() => saveSection(fields)}
        isPending={sectionMutation.isPending}
      />
    ) : undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-20">
      {/* ================================================================
          Sección 1: Información Básica
      ================================================================ */}
      <CollapsibleCard
        icon={<Info className="size-5 text-primary" />}
        title="Información Básica"
        defaultOpen={true}
        hasUnsavedChanges={isEdit && dirtyBasic}
        rightSlot={makeSaveSlot(BASIC_FIELDS)}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Nombre del Establecimiento" error={errors.name?.message}>
            <Input {...register('name')} placeholder="Ej: Velour Club" />
          </Field>
          <Field label="Ciudad" error={errors.city?.message}>
            <Input {...register('city')} placeholder="Ej: CDMX" />
          </Field>
          <Field label="Dirección" error={errors.address?.message}>
            <Input {...register('address')} placeholder="Calle y número..." />
          </Field>
          <Field label="Teléfono" error={errors.phone?.message}>
            <Input {...register('phone')} placeholder="+52 ..." />
          </Field>
          <Field label="Descripción" className="sm:col-span-2" error={errors.description?.message}>
            <Textarea {...register('description')} rows={4} placeholder="Describe el ambiente, el concepto..." />
          </Field>
          <Field
            label="Link de Google Maps"
            className="sm:col-span-2"
            error={errors.googleMapsUrl?.message}
            description="Pega el link de Maps y se autollenan latitud y longitud"
          >
            <Input
              {...register('googleMapsUrl', {
                onChange: async (e) => {
                  const value = e.target.value;
                  if (!value || value.length < 10) return;
                  const parsed = await resolveAndParseGoogleMapsUrl(value);
                  if (parsed) {
                    setValue('latitude', parsed.lat, { shouldDirty: true, shouldValidate: true });
                    setValue('longitude', parsed.lng, { shouldDirty: true, shouldValidate: true });
                    toast.success('Coordenadas extraídas del link');
                  }
                },
              })}
              placeholder="https://maps.app.goo.gl/... o https://www.google.com/maps/..."
            />
          </Field>
          <Field
            label="Latitud"
            error={errors.latitude?.message}
            description="Se autollena con el link, o edítala a mano"
          >
            <Input
              type="number"
              step="any"
              {...register('latitude')}
              placeholder="Ej: 18.9244"
            />
          </Field>
          <Field
            label="Longitud"
            error={errors.longitude?.message}
            description="Se autollena con el link, o edítala a mano"
          >
            <Input
              type="number"
              step="any"
              {...register('longitude')}
              placeholder="Ej: -99.2210"
            />
          </Field>
        </div>
      </CollapsibleCard>

      {/* ================================================================
          Sección 2: Operación y Concepto
      ================================================================ */}
      <CollapsibleCard
        icon={<Music className="size-5 text-primary" />}
        title="Operación y Concepto"
        defaultOpen={false}
        hasUnsavedChanges={isEdit && dirtyConcept}
        rightSlot={makeSaveSlot(CONCEPT_FIELDS)}
      >
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Field label="Capacidad (personas)" error={errors.capacity?.message}>
              <Input type="number" {...register('capacity')} />
            </Field>
            <Field label="Edad Mínima" error={errors.minAge?.message}>
              <Input type="number" {...register('minAge')} />
            </Field>
            <Field label="Código de Vestimenta" error={errors.dressCode?.message}>
              <Input {...register('dressCode')} placeholder="Ej: Casual Elegante" />
            </Field>
          </div>

          <Field label="Tipo de Música">
            <div className="mt-2 flex flex-wrap gap-2">
              {MUSIC_TYPES.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleMusic(genre)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors active:scale-95 transition-transform ${
                    selectedMusic.includes(genre)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </CollapsibleCard>

      {/* ================================================================
          Sección 3: Horarios
      ================================================================ */}
      <CollapsibleCard
        icon={<Clock className="size-5 text-primary" />}
        title="Horarios de Apertura"
        defaultOpen={false}
        hasUnsavedChanges={isEdit && dirtyHours}
        rightSlot={makeSaveSlot(HOURS_FIELDS)}
      >
        <div className="divide-y rounded-lg border border-white/10">
          {Object.entries(openHours).map(([day, config]: [string, { open: string; close: string; closed: boolean }]) => {
            const DAY_ES: Record<string, string> = {
              monday: 'Lunes',
              tuesday: 'Martes',
              wednesday: 'Miércoles',
              thursday: 'Jueves',
              friday: 'Viernes',
              saturday: 'Sábado',
              sunday: 'Domingo',
            };
            return (
              <div
                key={day}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-32 font-medium">{DAY_ES[day] ?? day}</div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!config.closed}
                      onChange={(e) => handleHourChange(day, 'closed', !e.target.checked)}
                      className="rounded border-muted bg-background text-primary focus:ring-primary"
                    />
                    <span className="text-sm">Abierto</span>
                  </label>
                  {!config.closed && (
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                      <Input
                        type="time"
                        value={config.open || '22:00'}
                        onChange={(e) => handleHourChange(day, 'open', e.target.value)}
                        className="flex-1 sm:w-32 sm:flex-none"
                      />
                      <span className="text-muted-foreground">a</span>
                      <Input
                        type="time"
                        value={config.close || '05:00'}
                        onChange={(e) => handleHourChange(day, 'close', e.target.value)}
                        className="flex-1 sm:w-32 sm:flex-none"
                      />
                    </div>
                  )}
                  {config.closed && (
                    <span className="text-sm italic text-muted-foreground">Cerrado</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleCard>

      {/* ================================================================
          Sección 4: Galería de Fotos
      ================================================================ */}
      <CollapsibleCard
        icon={<Camera className="size-5 text-primary" />}
        title="Galería de Fotos"
        defaultOpen={false}
        hasUnsavedChanges={isEdit && dirtyGallery}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => imagesInputRef.current?.click()}
              disabled={isUploadingImages}
              className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
            >
              {isUploadingImages ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
              Subir Fotos
            </button>
            {isEdit && makeSaveSlot(GALLERY_FIELDS)}
          </div>
        }
      >
        <input
          type="file"
          ref={imagesInputRef}
          onChange={onImagesUpload}
          multiple
          accept="image/*"
          className="hidden"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((url, idx) => (
            <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-muted">
              <Image src={url} alt={`Foto ${idx}`} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" unoptimized className="object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setPreviewUrl(url)}
                  className="rounded-full bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/30 active:scale-95 transition-transform"
                  aria-label="Ver en grande"
                >
                  <Eye className="size-5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-500 active:scale-95"
                aria-label="Eliminar"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          {isUploadingImages && (
            <>
              <div className="aspect-square animate-pulse rounded-lg bg-muted/50" />
              <div className="aspect-square animate-pulse rounded-lg bg-muted/50" />
            </>
          )}
          {images.length === 0 && !isUploadingImages && (
            <div
              className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 text-muted-foreground hover:bg-white/[0.04]"
              onClick={() => imagesInputRef.current?.click()}
            >
              <Upload className="mb-2 size-6" />
              <span className="text-xs">Añadir fotos</span>
            </div>
          )}
        </div>
      </CollapsibleCard>

      {/* ================================================================
          Sección 5: Portada y Links
      ================================================================ */}
      <CollapsibleCard
        icon={<BookOpen className="size-5 text-primary" />}
        title="Portada y Enlaces"
        defaultOpen={false}
        hasUnsavedChanges={isEdit && dirtyCover}
        rightSlot={makeSaveSlot(COVER_FIELDS)}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Imagen de Portada">
            <div className="flex flex-col gap-4">
              {coverImageUrl ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-muted">
                  <Image src={coverImageUrl} alt="Portada" fill sizes="(max-width: 768px) 100vw, 50vw" unoptimized className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setValue('coverImageUrl', '', { shouldDirty: true })}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-red-500"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 text-muted-foreground hover:bg-white/[0.04]"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {isUploadingCover ? <Loader2 className="size-8 animate-spin" /> : <Upload className="mb-2 size-8" />}
                  <span>Subir imagen de portada</span>
                </div>
              )}
              <input
                type="file"
                ref={coverInputRef}
                onChange={onCoverUpload}
                accept="image/*"
                className="hidden"
              />
              <Input {...register('coverImageUrl')} placeholder="O pega un link directo..." />
            </div>
          </Field>

          <div className="space-y-6">
            <Field label="URL de la Carta/Menú (PDF)" error={errors.menuUrl?.message}>
              <Input {...register('menuUrl')} placeholder="https://..." />
            </Field>

            <div className="grid gap-4">
              <Field label="Instagram">
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="@usuario"
                    value={watch('socialLinks')?.instagram || ''}
                    onChange={(e) => {
                      const links = { ...watch('socialLinks') };
                      links.instagram = e.target.value;
                      setValue('socialLinks', links, { shouldDirty: true });
                    }}
                  />
                </div>
              </Field>
              <Field label="Facebook">
                <div className="relative">
                  <Facebook className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Link..."
                    value={watch('socialLinks')?.facebook || ''}
                    onChange={(e) => {
                      const links = { ...watch('socialLinks') };
                      links.facebook = e.target.value;
                      setValue('socialLinks', links, { shouldDirty: true });
                    }}
                  />
                </div>
              </Field>
              <Field label="TikTok">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="@usuario"
                    value={watch('socialLinks')?.tiktok || ''}
                    onChange={(e) => {
                      const links = { ...watch('socialLinks') };
                      links.tiktok = e.target.value;
                      setValue('socialLinks', links, { shouldDirty: true });
                    }}
                  />
                </div>
              </Field>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* ================================================================
          Global submit — only shown in create mode
      ================================================================ */}
      {!isEdit && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="w-full px-8 font-bold sm:w-auto"
          >
            {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {submitLabel}
          </Button>
        </div>
      )}

      {/* Image preview lightbox */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-6"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
          <img
            src={previewUrl}
            alt="Vista previa"
            className="max-h-[90dvh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </form>
  );
}
