'use client';

import * as React from 'react';
import { Download, Loader2, Plus, MoreVertical, Compass } from 'lucide-react';
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

function Step({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </span>
      <span className="text-foreground/90">{children}</span>
    </li>
  );
}

/**
 * Primer contacto sin la app instalada: en vez de bombardear con permisos,
 * invitamos a instalar la PWA. Los permisos (notificaciones) se piden después,
 * ya dentro de la app instalada (ver gating en el layout customer).
 *
 * - Android Chrome: botón nativo "Instalar app" si capturamos beforeinstallprompt.
 * - iOS Safari: instrucciones (Compartir → Agregar a inicio), no hay API.
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Download className="size-7" />
          </div>
          <DialogTitle className="text-center text-xl">
            Instala NightPass
          </DialogTitle>
          <DialogDescription className="text-center">
            Añádela a tu pantalla de inicio para entrar más rápido y recibir
            avisos de eventos, ventas y tus pases.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-3">
          {canPrompt ? (
            // Android Chrome: instalación nativa en un toque.
            <Button
              type="button"
              onClick={onInstall}
              disabled={installing}
              className="w-full rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] py-5 text-base font-semibold text-white"
            >
              {installing ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Download className="size-5" />
              )}
              Instalar app
            </Button>
          ) : platform === 'ios' && iosSafari ? (
            // iOS Safari: no hay API. Un video corto muestra "Agregar a inicio".
            <div className="space-y-2">
              <video
                src={IOS_INSTALL_VIDEO}
                className="mx-auto w-full max-w-[240px] rounded-2xl border border-white/10"
                autoPlay
                muted
                loop
                playsInline
                controls
              />
              <p className="text-center text-sm text-muted-foreground">
                Toca <strong className="text-foreground">Compartir</strong> y luego{' '}
                <strong className="text-foreground">Agregar a inicio</strong>.
              </p>
            </div>
          ) : platform === 'ios' ? (
            // iOS pero NO Safari (Chrome/Firefox/etc): no pueden instalar PWA.
            <ol className="flex flex-col gap-2">
              <Step icon={<Compass className="size-4" />}>
                Abre <strong>nightpass</strong> en <strong>Safari</strong> (no
                desde este navegador).
              </Step>
              <Step icon={<Plus className="size-4" />}>
                Ahí toca <strong>Compartir → Agregar a inicio</strong>.
              </Step>
            </ol>
          ) : (
            // Android sin beforeinstallprompt (ya descartado, u otro navegador).
            <ol className="flex flex-col gap-2">
              <Step icon={<MoreVertical className="size-4" />}>
                Abre el menú <strong>⋮</strong> del navegador.
              </Step>
              <Step icon={<Plus className="size-4" />}>
                Elige <strong>Instalar app</strong> o{' '}
                <strong>Agregar a pantalla de inicio</strong>.
              </Step>
            </ol>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="w-full rounded-xl text-muted-foreground hover:text-foreground"
          >
            Ahora no
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
