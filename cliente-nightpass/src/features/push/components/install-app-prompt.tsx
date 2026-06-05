'use client';

import * as React from 'react';
import { Download, Loader2, Plus, MoreVertical, Compass, Share } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import { usePwaInstall } from '../hooks/use-pwa-install';

const SESSION_KEY = 'np-install-prompt-shown';

/** Video del flujo "Agregar a inicio" en Safari (servido desde R2/CDN). */
const IOS_INSTALL_VIDEO =
  'https://pub-2830ac97394b4104993532e9c452b1c2.r2.dev/static/ios-install.mp4';

/** Paso numerado con icono — guía clara de "qué botón tocar". */
function Step({
  n,
  icon,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#9333ea] to-[#a855f7] text-xs font-bold text-white">
        {n}
      </span>
      <span className="flex flex-1 items-center gap-2 text-foreground/90">
        {children}
      </span>
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </span>
    </li>
  );
}

/**
 * Primer contacto sin la app instalada: en vez de bombardear con permisos,
 * invitamos a instalar la PWA. Los permisos (notificaciones) se piden después,
 * ya dentro de la app instalada (ver gating en el layout customer).
 *
 * - Android Chrome: botón nativo "Instalar app" si capturamos beforeinstallprompt.
 * - iOS Safari: video del flujo Compartir → Agregar a inicio (no hay API).
 * - iOS en otro navegador: aviso de abrir en Safari (solo Safari instala PWA).
 * - Desktop / standalone: no se muestra.
 */
export function InstallAppPrompt() {
  const { checked, isStandalone, canPrompt, platform, iosSafari, promptInstall } =
    usePwaInstall();
  const [open, setOpen] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);

  const isMobile = platform === 'ios' || platform === 'android';

  React.useEffect(() => {
    if (!checked || isStandalone || !isMobile) return;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;

    const t = setTimeout(() => {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
      sessionStorage.setItem(SESSION_KEY, '1');
      setOpen(true);
    }, 1200);
    return () => clearTimeout(t);
  }, [checked, isStandalone, isMobile]);

  // Si se instala mientras está abierto, cerrar.
  React.useEffect(() => {
    if (isStandalone) setOpen(false);
  }, [isStandalone]);

  const onInstall = async () => {
    setInstalling(true);
    try {
      const ok = await promptInstall();
      if (ok) setOpen(false);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 overflow-hidden sm:max-w-sm">
        <DialogHeader className="space-y-3">
          <div className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#9333ea] to-[#a855f7] text-white shadow-[0_8px_30px_rgba(168,85,247,0.45)]">
            <Download className="size-8" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            Instala NightPass
          </DialogTitle>
          <DialogDescription className="text-center text-[13px] leading-relaxed">
            Añádela a tu inicio para entrar más rápido y recibir avisos de
            eventos, ventas y tus pases.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 flex flex-col gap-4">
          {canPrompt ? (
            // Android Chrome: instalación nativa en un toque.
            <Button
              type="button"
              onClick={onInstall}
              disabled={installing}
              className="w-full rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] py-6 text-base font-semibold text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)]"
            >
              {installing ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Download className="size-5" />
              )}
              Instalar app
            </Button>
          ) : platform === 'ios' && iosSafari ? (
            // iOS Safari: video del flujo + pasos numerados.
            <>
              <div className="relative mx-auto w-fit">
                <div className="absolute -inset-3 -z-10 rounded-[28px] bg-primary/20 blur-2xl" />
                <video
                  src={IOS_INSTALL_VIDEO}
                  className="w-[210px] rounded-[26px] border border-white/12 shadow-2xl"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              </div>
              <ol className="flex flex-col gap-2">
                <Step n={1} icon={<Share className="size-4" />}>
                  Toca <strong className="font-semibold">Compartir</strong>
                </Step>
                <Step n={2} icon={<Plus className="size-4" />}>
                  Elige{' '}
                  <strong className="font-semibold">Agregar a inicio</strong>
                </Step>
              </ol>
            </>
          ) : platform === 'ios' ? (
            // iOS pero NO Safari (Chrome/Firefox/etc): no pueden instalar PWA.
            <ol className="flex flex-col gap-2">
              <Step n={1} icon={<Compass className="size-4" />}>
                Abre <strong className="font-semibold">nightpass.mx</strong> en{' '}
                <strong className="font-semibold">Safari</strong>
              </Step>
              <Step n={2} icon={<Plus className="size-4" />}>
                Ahí toca{' '}
                <strong className="font-semibold">
                  Compartir → Agregar a inicio
                </strong>
              </Step>
            </ol>
          ) : (
            // Android sin beforeinstallprompt (ya descartado, u otro navegador).
            <ol className="flex flex-col gap-2">
              <Step n={1} icon={<MoreVertical className="size-4" />}>
                Abre el menú <strong className="font-semibold">⋮</strong> del
                navegador
              </Step>
              <Step n={2} icon={<Plus className="size-4" />}>
                Elige{' '}
                <strong className="font-semibold">
                  Instalar app / Agregar a inicio
                </strong>
              </Step>
            </ol>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="w-full rounded-xl text-sm text-muted-foreground hover:text-foreground"
          >
            Ahora no
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
