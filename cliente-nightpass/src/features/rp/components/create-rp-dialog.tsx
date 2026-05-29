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

interface CreateRpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRpDialog({ open, onOpenChange }: CreateRpDialogProps) {
  const { mutate: createRp, isPending } = useCreateRp();
  const [email, setEmail] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [promoterId, setPromoterId] = React.useState('');
  const [promoters, setPromoters] = React.useState<Array<{ id: string; name: string }>>([]);
  const [eventId, setEventId] = React.useState('');
  const [events, setEvents] = React.useState<Array<{ id: string; title: string }>>([]);

  React.useEffect(() => {
    if (open) {
      setEmail('');
      setDisplayName('');
      setPassword('');
      setPromoterId('');
      setEventId('');
      
      // Load promoters list
      clientFetch<{ items: Array<{ id: string; name: string }> }>('/api/promoters')
        .then((res) => {
          setPromoters(res.items || []);
        })
        .catch(() => {
          // Silent ignore
        });

      // Load events list
      clientFetch<{ items: Array<{ id: string; title: string }> }>('/api/events?limit=100')
        .then((res) => {
          setEvents(res.items || []);
        })
        .catch(() => {
          // Silent ignore
        });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !displayName || !eventId) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    createRp(
      {
        email,
        displayName,
        password: password || undefined,
        promoterId: promoterId || undefined,
        eventId: eventId || undefined,
      },
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
