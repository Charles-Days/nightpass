'use client';

import * as React from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { useEventDetail } from '../hooks/use-event-detail';
import { useCreateTier } from '../hooks/use-create-tier';
import { useDeleteTier } from '../hooks/use-delete-tier';

interface Props {
  eventId: string;
}

function formatPrice(cents: number, currency: string) {
  const symbol = currency === 'MXN' ? '$' : currency === 'EUR' ? '€' : '$';
  return `${symbol}${(cents / 100).toFixed(2)} ${currency}`;
}

export function TiersSection({ eventId }: Props) {
  const detail = useEventDetail(eventId);
  const createTier = useCreateTier(eventId);
  const deleteTier = useDeleteTier(eventId);

  const [name, setName] = React.useState('');
  const [priceMxn, setPriceMxn] = React.useState('');
  const [capacity, setCapacity] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const tiers = detail.data?.tiers ?? [];

  const reset = () => {
    setName('');
    setPriceMxn('');
    setCapacity('');
    setError(null);
  };

  const submit = async () => {
    setError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Nombre debe tener al menos 2 caracteres');
      return;
    }
    const priceFloat = parseFloat(priceMxn);
    if (isNaN(priceFloat) || priceFloat < 0) {
      setError('Precio inválido');
      return;
    }
    const priceCents = Math.round(priceFloat * 100);

    const capacityInt = capacity ? parseInt(capacity, 10) : undefined;
    if (capacity && (isNaN(capacityInt!) || capacityInt! < 1)) {
      setError('Capacidad debe ser un entero positivo');
      return;
    }

    try {
      await createTier.mutateAsync({
        name: trimmedName,
        priceCents,
        currency: 'MXN',
        capacity: capacityInt,
        position: tiers.length,
      });
      reset();
    } catch {
      // toast handled in hook
    }
  };

  return (
    <div className="space-y-4 border-t border-white/10 pt-5">
      <div>
        <h4 className="font-display text-base font-semibold">Tiers de precio</h4>
        <p className="text-xs text-muted-foreground">
          Cada tier es una categoría de pase con su precio. Sin tiers no se
          puede vender.
        </p>
      </div>

      {/* Lista existente */}
      {detail.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando tiers…
        </div>
      ) : tiers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 bg-white/[0.015] p-3 text-center text-xs text-muted-foreground">
          Aún no hay tiers. Agrega al menos uno para vender.
        </p>
      ) : (
        <div className="space-y-2">
          {tiers.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(t.priceCents, t.currency)}
                  {t.capacity ? ` · cupo ${t.capacity}` : ' · sin límite'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-destructive/70 hover:text-destructive"
                title="Eliminar tier"
                disabled={deleteTier.isPending}
                onClick={() => {
                  if (confirm(`Eliminar tier "${t.name}"?`)) {
                    deleteTier.mutate(t.id);
                  }
                }}
              >
                {deleteTier.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Crear tier — div, no form (no se puede anidar form en HTML) */}
      <div
        className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3"
        onKeyDown={(e) => {
          // Enter en cualquier input dispara el submit, sin disparar el form padre
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
            e.preventDefault();
            submit();
          }
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">
          Agregar tier nuevo
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nombre" htmlFor="tier-name" error={undefined}>
            <Input
              id="tier-name"
              placeholder="Ej. General"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Precio (MXN)" htmlFor="tier-price" error={undefined}>
            <Input
              id="tier-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="200.00"
              value={priceMxn}
              onChange={(e) => setPriceMxn(e.target.value)}
            />
          </Field>
          <Field
            label="Cupo (opcional)"
            htmlFor="tier-capacity"
            error={undefined}
          >
            <Input
              id="tier-capacity"
              type="number"
              min="1"
              placeholder="Sin límite"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </Field>
        </div>

        {error ? (
          <p className="text-xs text-amber-300">{error}</p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={createTier.isPending}
            className="gap-1.5 rounded-full"
            onClick={submit}
          >
            {createTier.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Agregar tier
          </Button>
        </div>
      </div>
    </div>
  );
}
