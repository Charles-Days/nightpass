'use client';

import { useState } from 'react';
import { MapPin, ShieldCheck, ShieldAlert, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { ConfirmDialog } from '@/core/components/ui/confirm-dialog';
import { useGeolocation } from '../hooks/use-geolocation';
import { usePlatform } from '../hooks/use-platform';

export function LocationPermissionStatus() {
  const { status, request } = useGeolocation();
  const platform = usePlatform();
  const [requesting, setRequesting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      const pos = await request();
      if (pos) {
        toast.success('Ubicación activada.');
        // Mark as onboarded so the modal doesn't pop again.
        try {
          await fetch('/api/auth/me/location-onboarded', {
            method: 'PATCH',
            credentials: 'include',
          });
        } catch {
          // ignore
        }
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/me/locations', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        toast.success('Historial de ubicación borrado.');
      } else {
        toast.error('No se pudo borrar el historial. Intenta de nuevo.');
      }
    } catch {
      toast.error('Error de red. Intenta de nuevo.');
    } finally {
      setClearing(false);
      setConfirmOpen(false);
    }
  };

  const platformTutorial = (() => {
    if (platform.os === 'ios') {
      return 'Ajustes → Safari → Ubicación → Permitir.';
    }
    if (platform.os === 'android') {
      return 'Toca el candado en la barra del navegador → Permisos → Ubicación → Permitir.';
    }
    return 'Abre los Ajustes de tu navegador y permite la ubicación para este sitio.';
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-[16px] border border-white/10 bg-white/[0.025] p-4">
        <span
          className={
            'mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ' +
            (status === 'granted'
              ? 'bg-emerald-400/15 text-emerald-300'
              : status === 'denied'
                ? 'bg-amber-400/15 text-amber-300'
                : 'bg-white/[0.04] text-white/55')
          }
        >
          {status === 'granted' ? (
            <ShieldCheck className="size-4" />
          ) : status === 'denied' ? (
            <ShieldAlert className="size-4" />
          ) : (
            <MapPin className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {status === 'granted' && 'Ubicación activada'}
            {status === 'denied' && 'Ubicación bloqueada'}
            {status === 'prompt' && 'Ubicación sin permiso'}
            {status === 'idle' && 'Detectando…'}
            {status === 'unsupported' && 'No soportada en este dispositivo'}
          </p>
          <p className="mt-0.5 text-xs text-white/55">
            {status === 'granted' &&
              'Usamos tu ubicación solo cuando la app está abierta.'}
            {status === 'denied' && platformTutorial}
            {status === 'prompt' && 'Activa el acceso para ver bares cercanos.'}
            {status === 'idle' && 'Estamos verificando el estado del permiso.'}
            {status === 'unsupported' &&
              'Tu navegador no soporta geolocalización web.'}
          </p>

          {platform.os === 'ios' && platform.standalone && (
            <p className="mt-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-[11px] leading-snug text-white/45">
              En iPhone, al cerrar y volver a abrir la app puede que tengas que
              reactivar la ubicación. Es una limitación de iOS para apps
              agregadas a la pantalla de inicio.
            </p>
          )}

          {status !== 'granted' && status !== 'unsupported' && status !== 'denied' && (
            <Button
              onClick={handleRequest}
              disabled={requesting}
              className="mt-3 h-9 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)] hover:opacity-95"
            >
              {requesting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Solicitando…
                </>
              ) : (
                <>
                  <MapPin className="size-3.5" />
                  Activar
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        onClick={() => setConfirmOpen(true)}
        disabled={clearing}
        className="h-10 w-full justify-start gap-3 rounded-[16px] border border-white/8 bg-white/[0.02] px-4 text-sm font-medium text-white/75 hover:bg-white/[0.04] hover:text-white"
      >
        {clearing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4 text-amber-300" />
        )}
        Borrar mi historial de ubicación
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Borrar tu historial de ubicación?"
        description="Eliminaremos todos tus pings de ubicación guardados. Esta acción no se puede deshacer."
        confirmLabel="Sí, borrar"
        cancelLabel="Cancelar"
        variant="destructive"
        loading={clearing}
        onConfirm={handleClearHistory}
      />
    </div>
  );
}
