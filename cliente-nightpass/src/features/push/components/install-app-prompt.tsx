'use client';

import * as React from 'react';
import { Download, Loader2, Plus, Compass } from 'lucide-react';
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

const R2_STATIC = 'https://pub-2830ac97394b4104993532e9c452b1c2.r2.dev/static';
/** Video del flujo "Agregar a inicio" en Safari iOS. */
const IOS_INSTALL_VIDEO = `${R2_STATIC}/ios-install.mp4`;
/** Video del flujo "Instalar app" en Chrome / Android. */
const CHROME_INSTALL_VIDEO = `${R2_STATIC}/chrome-install.mp4`;

/** Paso numerado con icono — solo para iOS sin video (Firefox/Edge → Safari). */
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

/** Marco con glow para los videos de instalación. Escala por altura para no
 * desbordar pantallas chicas. */
function VideoFrame({ src }: { src: string }) {
  return (
    <div className="relative mx-auto w-fit">
      <div className="absolute -inset-2 -z-10 rounded-[24px] bg-primary/20 blur-2xl" />
      <video
        src={src}
        className="max-h-[58svh] w-auto rounded-[22px] border border-white/12 shadow-2xl"
        autoPlay
        muted
        loop
        playsInline
      />
    </div>
  );
}

/**
 * Primer contacto sin la app instalada: invitamos a instalar la PWA (los
 * permisos se piden después, ya instalada — ver gating en el layout customer).
 *
 * - Android Chrome con prompt nativo: botón "Instalar app" (un toque).
 * - iOS Safari / iOS Chrome / Android fallback: video del flujo. Se cierra con
 *   la X (sin pasos ni "Ahora no" — el video muestra todo).
 * - iOS Firefox/Edge/etc: no instalan PWA → texto para abrir en Safari.
 */
export function InstallAppPrompt() {
  const { checked, isStandalone, canPrompt, platform, iosSafari, iosChrome, promptInstall } =
    usePwaInstall();
  const [open, setOpen] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);

  const isMobile = platform === 'ios' || platform === 'android';
  const iosNoInstall = platform === 'ios' && !iosSafari && !iosChrome;
  const videoSrc = iosSafari ? IOS_INSTALL_VIDEO : CHROME_INSTALL_VIDEO;

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
      <DialogContent className="max-h-[92svh] gap-0 overflow-y-auto sm:max-w-sm">
        <DialogHeader className="space-y-2">
          <div className="relative mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#9333ea] to-[#a855f7] text-white shadow-[0_8px_30px_rgba(168,85,247,0.45)]">
            <Download className="size-6" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            Instala NightPass
          </DialogTitle>
          <DialogDescription className="text-center text-xs leading-relaxed">
            Añádela a tu inicio para entrar más rápido y no perderte nada.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-3">
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
          ) : iosNoInstall ? (
            // iOS en Firefox/Edge/etc: no hay video del flujo → abrir en Safari.
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
            // iOS Safari / iOS Chrome / Android fallback: solo el video (la X cierra).
            <VideoFrame src={videoSrc} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
