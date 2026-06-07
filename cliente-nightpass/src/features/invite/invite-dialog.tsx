'use client';

import * as React from 'react';
import { Check, Copy, Gift, Loader2, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import { useMyReferral } from './use-my-referral';
import { useInviteEvents } from './use-invite-events';

function formatEventDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

/**
 * Diálogo "Invita y gana NPP". El `children` es el trigger (botón o card).
 * Construye el link `${origin}/app?inv=CODE`; al compartirlo el dueño gana NPP
 * cuando alguien lo abre y más cuando ese alguien crea su cuenta.
 */
export function InviteDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = useMyReferral(open);
  const [origin, setOrigin] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [mode, setMode] = React.useState<'general' | 'event'>('general');
  const [eventId, setEventId] = React.useState('');
  const events = useInviteEvents(open && mode === 'event');

  React.useEffect(() => setOrigin(window.location.origin), []);

  const url = !data
    ? ''
    : mode === 'event' && eventId
      ? `${origin}/app/evento/${eventId}?inv=${data.code}`
      : `${origin}/app?inv=${data.code}`;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const share = async () => {
    if (!url) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'NightPass',
          text: 'Únete a NightPass con mi link 🎟️',
          url,
        });
      } catch {
        // cancelado por el usuario — sin error.
      }
    } else {
      void copy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex items-center gap-2">
            <Gift className="size-5 text-primary" />
            Invita y gana NPP
          </DialogTitle>
          <DialogDescription>
            Ganas NPP cuando alguien abre tu link, y más cuando crea su cuenta.
            Un link por evento vale el doble.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="flex min-w-0 justify-center py-10">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="min-w-0 space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-4 text-center">
                <p className="font-display text-2xl font-bold">{data.referredCount}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="size-3" /> Invitados
                </p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/[0.08] p-4 text-center">
                <p className="font-display text-2xl font-bold text-primary">
                  {data.pointsEarned}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">NPP ganados</p>
              </div>
            </div>

            <div className="flex gap-2 rounded-full bg-white/[0.05] p-1">
              {(['general', 'event'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    mode === m
                      ? 'bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'general' ? 'General' : 'Por evento ×2'}
                </button>
              ))}
            </div>

            {mode === 'event' && (
              <div>
                {events.isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                ) : (events.data ?? []).length === 0 ? (
                  <p className="rounded-xl border border-white/12 bg-white/[0.03] p-4 text-center text-[12px] text-white/55">
                    No hay eventos próximos para compartir.
                  </p>
                ) : (
                  <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                    {events.data!.map((ev) => {
                      const selected = ev.id === eventId;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setEventId(ev.id)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                            selected
                              ? 'border-primary bg-primary/[0.1]'
                              : 'border-white/12 bg-white/[0.03] hover:bg-white/[0.06]'
                          }`}
                        >
                          <div
                            className="size-12 shrink-0 rounded-lg bg-cover bg-center"
                            style={{
                              backgroundImage: ev.coverImageUrl
                                ? `url(${ev.coverImageUrl})`
                                : 'linear-gradient(135deg, #9333ea66, #ec489933)',
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{ev.title}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {[ev.placeName, formatEventDate(ev.startsAt)]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                          {selected && (
                            <Check className="size-4 shrink-0 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 px-1 text-[11px] text-primary/80">
                  Compartir un evento te da el doble de NPP.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-white/12 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Tu link
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-black/30 px-2 py-1.5 text-[11px] text-white/60">
                  {url || 'Elige un evento primero'}
                </code>
                <Button
                  type="button"
                  size="sm"
                  onClick={copy}
                  disabled={!url}
                  className="shrink-0 rounded-lg bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white disabled:opacity-40"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </div>

            <Button
              type="button"
              onClick={share}
              disabled={!url}
              className="w-full gap-2 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] py-5 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Share2 className="size-4" />
              Compartir mi link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
