'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, MapPin } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import { clientFetch } from '@/core/lib/api/client-client';
import { useUpdateRpZone, type RpProfile } from '../hooks/use-rp';

/**
 * Edita la zona (estado/ciudad) del RP. La zona enruta las solicitudes de pago
 * en efectivo de clientes de esa ciudad/estado a este RP (reparto equitativo).
 */
export function RpZoneEditor({
  rpId,
  basePath = '/api/rp',
}: {
  rpId: string;
  basePath?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['rps', 'detail', rpId, 'zone'],
    queryFn: () => clientFetch<RpProfile>(`${basePath}/${rpId}`),
  });
  const update = useUpdateRpZone(basePath);

  const [state, setState] = React.useState('');
  const [city, setCity] = React.useState('');
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (data && !ready) {
      setState(data.state ?? '');
      setCity(data.city ?? '');
      setReady(true);
    }
  }, [data, ready]);

  const save = () => {
    update.mutate(
      { id: rpId, state: state.trim() || undefined, city: city.trim() || undefined },
      {
        onSuccess: () => toast.success('Zona del RP actualizada'),
        onError: () => toast.error('No pudimos actualizar la zona'),
      },
    );
  };

  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.02] p-5">
      <h3 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
        <MapPin className="size-4 text-primary" />
        Zona (pago en efectivo)
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Las solicitudes de efectivo de clientes de esta ciudad/estado se enrutan a
        este RP, repartidas equitativamente con otros de la misma zona.
      </p>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="rp-state" className="text-white/70 text-xs">
              Estado
            </Label>
            <Input
              id="rp-state"
              placeholder="Ej. Jalisco"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-sm text-white"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="rp-city" className="text-white/70 text-xs">
              Ciudad
            </Label>
            <Input
              id="rp-city"
              placeholder="Ej. Guadalajara"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-sm text-white"
            />
          </div>
          <Button
            type="button"
            onClick={save}
            disabled={update.isPending}
            className="h-10 rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] font-semibold"
          >
            {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar
          </Button>
        </div>
      )}
    </div>
  );
}
