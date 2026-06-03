'use client';

import * as React from 'react';
import { useCreateRp } from '../hooks/use-rp';
import { clientFetch } from '@/core/lib/api/client-client';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import { Loader2 } from 'lucide-react';
import { MEXICO_GEO } from '@/core/data/mexico-geo';

interface CreateRpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  basePath?: string;
  /**
   * 'admin' permite elegir el organizador asociado. 'promoter' lo oculta — el
   * backend fuerza el promoterId del organizador autenticado.
   */
  scope?: 'admin' | 'promoter';
}

export function CreateRpDialog({
  open,
  onOpenChange,
  basePath = '/api/rp',
  scope = 'admin',
}: CreateRpDialogProps) {
  const { mutate: createRp, isPending } = useCreateRp(basePath);
  const [email, setEmail] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [state, setState] = React.useState('');
  const [city, setCity] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [promoterId, setPromoterId] = React.useState('');
  const [promoters, setPromoters] = React.useState<Array<{ id: string; name: string }>>([]);
  const [eventId, setEventId] = React.useState('');
  const [events, setEvents] = React.useState<Array<{ id: string; title: string }>>([]);
  const [commissionType, setCommissionType] = React.useState<'PER_N_TICKETS' | 'PERCENTAGE'>('PER_N_TICKETS');
  const [nTickets, setNTickets] = React.useState('10');
  const [reward, setReward] = React.useState('150');
  const [percentage, setPercentage] = React.useState('5');

  const rpCities = React.useMemo(
    () => MEXICO_GEO.find((e) => e.estado === state)?.ciudades ?? [],
    [state],
  );

  React.useEffect(() => {
    if (open) {
      setEmail('');
      setDisplayName('');
      setState('');
      setCity('');
      setPassword('');
      setPromoterId('');
      setEventId('');
      setCommissionType('PER_N_TICKETS');
      setNTickets('10');
      setReward('150');
      setPercentage('5');
      
      // Load promoters list (solo admin elige organizador)
      if (scope === 'admin') {
        clientFetch<{ items: Array<{ id: string; name: string }> }>('/api/promoters')
          .then((res) => {
            setPromoters(res.items || []);
          })
          .catch(() => {
            // Silent ignore
          });
      }

      // Load events list
      clientFetch<{ items: Array<{ id: string; title: string }> }>('/api/events?limit=100')
        .then((res) => {
          setEvents(res.items || []);
        })
        .catch(() => {
          // Silent ignore
        });
    }
  }, [open, scope]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !displayName || !eventId) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    const data: any = {
      email,
      displayName,
      state: state.trim() || undefined,
      city: city.trim() || undefined,
      password: password || undefined,
      promoterId: promoterId || undefined,
      eventId: eventId || undefined,
      commissionType,
    };

    if (commissionType === 'PER_N_TICKETS') {
      data.nTickets = parseInt(nTickets, 10);
      data.rewardCents = parseInt(reward, 10) * 100; // Convert to cents for database compatibility
    } else {
      data.percentage = parseFloat(percentage);
    }

    createRp(
      data,
      {
        onSuccess: (rp) => {
          toast.success(`RP creado exitosamente con el código: ${rp.rpCode}`);
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast.error(err.payload?.message || 'Error al crear el RP');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-[22px] border border-white/10 bg-[#0f0f17] text-white">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold tracking-tight text-white">
            Crear Nuevo RP
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="text-white/70 text-xs">
              Nombre Completo *
            </Label>
            <Input
              id="displayName"
              placeholder="Ej. Carlos Mendoza"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-white/[0.03] border-white/10 text-white rounded-xl h-10 placeholder-white/30 text-sm focus:border-primary/50"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="state" className="text-white/70 text-xs">
                Estado
              </Label>
              <select
                id="state"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setCity('');
                }}
                className="h-10 w-full rounded-xl border border-white/10 bg-[#0f0f17] px-3 text-sm text-white focus:border-primary/50 focus:outline-none"
              >
                <option value="">Estado…</option>
                {MEXICO_GEO.map((e) => (
                  <option key={e.estado} value={e.estado}>
                    {e.estado}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-white/70 text-xs">
                Ciudad
              </Label>
              <select
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!state}
                className="h-10 w-full rounded-xl border border-white/10 bg-[#0f0f17] px-3 text-sm text-white focus:border-primary/50 focus:outline-none disabled:opacity-50"
              >
                <option value="">Ciudad…</option>
                {rpCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-white/40">
            La zona del RP enruta las solicitudes de pago en efectivo de clientes
            de esa ciudad/estado.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-white/70 text-xs">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="carlos@nightpass.mx"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/[0.03] border-white/10 text-white rounded-xl h-10 placeholder-white/30 text-sm focus:border-primary/50"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-white/70 text-xs">
              Contraseña Temporal (Opcional)
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Dejar vacío para auto-generar"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/[0.03] border-white/10 text-white rounded-xl h-10 placeholder-white/30 text-sm focus:border-primary/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event" className="text-white/70 text-xs">
              Evento Inicial *
            </Label>
            <select
              id="event"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full bg-[#0f0f17] border border-white/10 rounded-xl h-10 px-3 text-white text-sm focus:border-primary/50 focus:outline-none"
              required
            >
              <option value="" disabled>Selecciona un evento</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 border-t border-white/5 pt-3">
            <Label htmlFor="commissionType" className="text-white/70 text-xs font-semibold text-purple-300">
              Esquema de Comisión Inicial *
            </Label>
            <select
              id="commissionType"
              value={commissionType}
              onChange={(e) => setCommissionType(e.target.value as any)}
              className="w-full bg-[#0f0f17] border border-white/10 rounded-xl h-10 px-3 text-white text-sm focus:border-primary/50 focus:outline-none"
              required
            >
              <option value="PER_N_TICKETS">Por Cantidad (Ej. $150 MXN por cada 10 boletos)</option>
              <option value="PERCENTAGE">Por Porcentaje (Ej. 5% por boleto)</option>
            </select>
          </div>

          {commissionType === 'PER_N_TICKETS' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nTickets" className="text-white/70 text-xs">
                  Número de Boletos (N)
                </Label>
                <Input
                  id="nTickets"
                  type="number"
                  min="1"
                  value={nTickets}
                  onChange={(e) => setNTickets(e.target.value)}
                  className="bg-white/[0.03] border-white/10 text-white rounded-xl h-10 placeholder-white/30 text-sm focus:border-primary/50"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reward" className="text-white/70 text-xs">
                  Recompensa ($ Pesos)
                </Label>
                <Input
                  id="reward"
                  type="number"
                  min="0"
                  placeholder="150"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  className="bg-white/[0.03] border-white/10 text-white rounded-xl h-10 placeholder-white/30 text-sm focus:border-primary/50"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="percentage" className="text-white/70 text-xs">
                Porcentaje (%)
              </Label>
              <Input
                id="percentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="bg-white/[0.03] border-white/10 text-white rounded-xl h-10 placeholder-white/30 text-sm focus:border-primary/50"
                required
              />
            </div>
          )}

          {scope === 'admin' && (
            <div className="space-y-1.5">
              <Label htmlFor="promoter" className="text-white/70 text-xs">
                Organizador Asociado (Opcional)
              </Label>
              <select
                id="promoter"
                value={promoterId}
                onChange={(e) => setPromoterId(e.target.value)}
                className="w-full bg-[#0f0f17] border border-white/10 rounded-xl h-10 px-3 text-white text-sm placeholder-white/30 focus:border-primary/50 focus:outline-none"
              >
                <option value="">Ninguno - Global</option>
                {promoters.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-white/10 text-white/70 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear RP'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
