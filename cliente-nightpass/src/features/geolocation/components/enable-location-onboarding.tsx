'use client';

import { useState } from 'react';
import { MapPin, ShieldCheck, Clock, AlertTriangle, Settings } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import { useGeolocation } from '../hooks/use-geolocation';
import { usePlatform } from '../hooks/use-platform';
import { setSnooze } from '../lib/snooze';

interface EnableLocationOnboardingProps {
  open: boolean;
  onComplete: () => void;
}

export function EnableLocationOnboarding({ open, onComplete }: EnableLocationOnboardingProps) {
  const { status, request } = useGeolocation();
  const platform = usePlatform();
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  const handleActivate = async () => {
    setBusy(true);
    try {
      const pos = await request();
      if (!pos) {
        // Either denied or failed.
        if (status === 'denied') {
          setDenied(true);
        } else {
          setDenied(true);
        }
        return;
      }

      // Mark user as onboarded server-side.
      try {
        const res = await fetch('/api/auth/me/location-onboarded', {
          method: 'PATCH',
          credentials: 'include',
        });
        if (!res.ok) {
          // Non-fatal: we still got permission. Log silently.
          // eslint-disable-next-line no-console
          console.warn('No se pudo marcar onboarded:', res.status);
        }
      } catch {
        // ignore
      }

      toast.success('Ubicación activada. Descubre la noche cerca de ti.');
      onComplete();
    } finally {
      setBusy(false);
    }
  };

  const handleLater = () => {
    setSnooze(24);
    toast('Te lo recordaremos más tarde.');
    onComplete();
  };

  const tutorialCopy = (() => {
    if (platform.os === 'ios') {
      return 'Ve a Ajustes → Safari → Ubicación, o Ajustes → Privacidad → Servicios de ubicación → Safari, y permite el acceso.';
    }
    if (platform.os === 'android') {
      return 'Toca el ícono de candado en la barra del navegador → Permisos → Ubicación → Permitir. O ve a Ajustes del sistema → Apps → Tu navegador → Permisos.';
    }
    return 'Abre los Ajustes de tu navegador y activa el permiso de ubicación para este sitio.';
  })();

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[24px] border border-white/10 bg-[#0E0B14]/95 p-0 text-white backdrop-blur-xl sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Glow header */}
        <div className="relative overflow-hidden px-6 pt-8 pb-2">
          <div className="absolute -top-20 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#9333ea] to-[#a855f7] shadow-[0_8px_32px_-8px_rgba(168,85,247,0.6)]">
            <MapPin className="size-8 text-white" />
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Aforo en vivo
          </p>
          <DialogTitle className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight">
            Activa tu ubicación para ver el aforo
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-relaxed text-white/65">
            El aforo en vivo se calcula con la ubicación de quienes están en cada bar.
            Si compartes la tuya, puedes ver qué tan lleno está cada lugar antes de ir.{' '}
            <strong className="text-white/85">
              Solo usamos tu ubicación cuando la app está abierta
            </strong>{' '}
            y nunca la compartimos. Borramos tu historial cada 24 horas.
          </DialogDescription>

          {/* Trust strip */}
          <ul className="mt-5 grid gap-2 text-left">
            <li className="flex items-start gap-2 rounded-[14px] border border-white/8 bg-white/[0.025] px-3 py-2 text-xs text-white/65">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-300" />
              No vendemos ni compartimos tu ubicación con terceros.
            </li>
            <li className="flex items-start gap-2 rounded-[14px] border border-white/8 bg-white/[0.025] px-3 py-2 text-xs text-white/65">
              <Clock className="mt-0.5 size-3.5 shrink-0 text-primary" />
              Borrado automático cada 24h. Tú decides desde tu perfil.
            </li>
          </ul>

          {denied && (
            <div className="mt-4 flex items-start gap-2 rounded-[14px] border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-left text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <div>
                <p className="font-semibold">El permiso está bloqueado.</p>
                <p className="mt-1">{tutorialCopy}</p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            {!denied ? (
              <Button
                onClick={handleActivate}
                disabled={busy}
                className="h-11 w-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] hover:opacity-95"
              >
                <MapPin className="size-4" />
                {busy ? 'Solicitando…' : 'Activar ubicación'}
              </Button>
            ) : (
              <Button
                onClick={handleLater}
                className="h-11 w-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] hover:opacity-95"
              >
                <Settings className="size-4" />
                Continuar igual
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleLater}
              className="h-10 w-full rounded-full text-xs font-semibold uppercase tracking-[0.16em] text-white/55 hover:bg-white/[0.04] hover:text-white"
            >
              Más tarde
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
