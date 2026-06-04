'use client';

import * as React from 'react';
import { useSetCommissionRule } from '../hooks/use-rp';
import { clientFetch } from '@/core/lib/api/client-client';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import { Loader2 } from 'lucide-react';

interface CommissionRuleFormProps {
  rpId: string;
  onSuccess: () => void;
  initialRule?: {
    eventId?: string | null;
    type: 'PER_N_TICKETS' | 'PERCENTAGE';
    nTickets?: number | null;
    rewardCents?: number | null;
    percentage?: number | null;
  } | null;
  /** Eventos que el RP ya tiene asignados — se ocultan del selector al agregar
   *  (salvo el que se esté editando) para dejar claro qué eventos faltan. */
  assignedEventIds?: string[];
  basePath?: string;
}

export function CommissionRuleForm({ rpId, onSuccess, initialRule, assignedEventIds = [], basePath = '/api/rp' }: CommissionRuleFormProps) {
  const { mutate: setRule, isPending } = useSetCommissionRule(basePath);
  const [type, setType] = React.useState<'PER_N_TICKETS' | 'PERCENTAGE'>('PER_N_TICKETS');
  const [eventId, setEventId] = React.useState('');
  const [nTickets, setNTickets] = React.useState('10');
  const [reward, setReward] = React.useState('150'); // $150 MXN
  const [percentage, setPercentage] = React.useState('5');
  const [events, setEvents] = React.useState<Array<{ id: string; title: string }>>([]);

  React.useEffect(() => {
    if (initialRule) {
      setType(initialRule.type);
      setEventId(initialRule.eventId || '');
      setNTickets(initialRule.nTickets?.toString() || '10');
      setReward(initialRule.rewardCents ? (initialRule.rewardCents / 100).toString() : '150');
      setPercentage(initialRule.percentage?.toString() || '5');
    } else {
      setType('PER_N_TICKETS');
      setEventId('');
      setNTickets('10');
      setReward('150');
      setPercentage('5');
    }
  }, [initialRule]);

  React.useEffect(() => {
    // Load events list for specific rule assignment
    clientFetch<{ items: Array<{ id: string; title: string }> }>('/api/events?limit=100')
      .then((res) => {
        setEvents(res.items || []);
      })
      .catch(() => {
        // Silent ignore
      });
  }, []);

  const isEditing = !!initialRule;
  // Al agregar, oculta los eventos ya asignados (cada evento solo admite una
  // regla por RP). Al editar, mantiene el evento actual disponible.
  const availableEvents = events.filter(
    (ev) => !assignedEventIds.includes(ev.id) || ev.id === initialRule?.eventId,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      type,
      eventId: eventId || undefined,
    };

    if (type === 'PER_N_TICKETS') {
      data.nTickets = parseInt(nTickets, 10);
      data.rewardCents = parseInt(reward, 10) * 100; // Convert standard pesos input to cents for backend compatibility
    } else {
      data.percentage = parseFloat(percentage);
    }

    setRule(
      { rpId, data },
      {
        onSuccess: () => {
          toast.success('Regla de comisión guardada correctamente');
          onSuccess();
        },
        onError: (err: any) => {
          toast.error(err.payload?.message || 'Error al guardar la regla');
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white/14 bg-white/[0.02] p-4 text-white">
      <h3 className="font-display text-sm font-semibold tracking-tight">
        {isEditing ? 'Editar Regla de Comisión' : 'Asignar Evento y Comisión'}
      </h3>

      <div className="space-y-1.5">
        <Label htmlFor="event" className="text-white/70 text-xs">
          Evento a asignar
        </Label>
        <select
          id="event"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          disabled={isEditing}
          className="w-full bg-[#0f0f17] border border-white/14 rounded-xl h-10 px-3 text-white text-sm focus:border-primary/50 focus:outline-none disabled:opacity-60"
        >
          <option value="">Cualquier Evento (Regla General)</option>
          {availableEvents.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
        {!isEditing && availableEvents.length === 0 ? (
          <span className="text-[10px] text-amber-300/80 block mt-1">
            Ya asignaste todos tus eventos a este RP. Puedes editar una regla
            existente o crear la regla general.
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground block mt-1">
            {isEditing
              ? 'El evento no se puede cambiar al editar. Crea otra regla para asignar un evento distinto.'
              : 'Elige el evento del RP. Déjalo en “Regla General” para una comisión por defecto.'}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ruleType" className="text-white/70 text-xs">
          Tipo de Comisión
        </Label>
        <select
          id="ruleType"
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="w-full bg-[#0f0f17] border border-white/14 rounded-xl h-10 px-3 text-white text-sm focus:border-primary/50 focus:outline-none"
        >
          <option value="PER_N_TICKETS">Por Cantidad (Ej. $150 MXN por cada 10 boletos)</option>
          <option value="PERCENTAGE">Por Porcentaje (Ej. 5% de cada boleto)</option>
        </select>
      </div>

      {type === 'PER_N_TICKETS' ? (
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
              className="bg-white/[0.05] border-white/14 text-white rounded-xl h-10 placeholder-white/30 text-sm focus:border-primary/50"
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
              className="bg-white/[0.05] border-white/14 text-white rounded-xl h-10 placeholder-white/30 text-sm focus:border-primary/50"
              required
            />
            <span className="text-[10px] text-muted-foreground block mt-1">
              Ej. 150 = $150.00 MXN
            </span>
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
            className="bg-white/[0.05] border-white/14 text-white rounded-xl h-10 placeholder-white/30 text-sm focus:border-primary/50"
            required
          />
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-primary/20 text-primary border border-primary/30 font-semibold h-10 px-5 hover:bg-primary/30"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Regla'
          )}
        </Button>
      </div>
    </form>
  );
}
