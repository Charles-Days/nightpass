'use client';

import { useState } from 'react';
import { Share2, Plus, Smartphone, Apple, ArrowDown, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/core/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/core/components/ui/tabs';
import { Button } from '@/core/components/ui/button';
import { usePlatform } from '../hooks/use-platform';
import { useInstallPrompt } from '../hooks/use-install-prompt';

interface InstallTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallTutorial({ open, onOpenChange }: InstallTutorialProps) {
  const platform = usePlatform();
  const { canInstall, promptInstall, installed } = useInstallPrompt();
  const [busy, setBusy] = useState(false);

  // If already installed/standalone, render nothing.
  if (platform.standalone || installed) return null;

  const defaultTab: 'ios' | 'android' = platform.os === 'android' ? 'android' : 'ios';

  const handlePromptInstall = async () => {
    setBusy(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        toast.success('NightPass instalada en tu dispositivo.');
        onOpenChange(false);
      } else if (outcome === 'dismissed') {
        toast('Puedes instalarla cuando quieras.');
      } else {
        toast.error('Tu navegador no soporta instalación directa. Usa el menú del navegador.');
      }
    } finally {
      setBusy(false);
    }
  };

  // Chrome on iOS does not support add-to-home-screen — only Safari does.
  const isChromeOnIOS =
    platform.os === 'ios' && !platform.isSafari && !platform.isInAppBrowser;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-[22px] border border-white/10 bg-[#0E0B14]/95 p-6 text-white backdrop-blur-xl sm:max-w-md">
        <div className="flex flex-col gap-1 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Mejor experiencia
          </p>
          <DialogTitle className="font-display text-2xl font-bold leading-tight tracking-tight">
            Instala NightPass
          </DialogTitle>
          <DialogDescription className="text-sm text-white/60">
            Tu pase siempre a mano, sin abrir navegador. Notificaciones de tus eventos y carga
            instantánea.
          </DialogDescription>
        </div>

        {platform.isInAppBrowser && (
          <div className="mt-2 flex items-start gap-2 rounded-[14px] border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Estás dentro de otra app. Abre NightPass en{' '}
              <strong>Safari</strong> o <strong>Chrome</strong> para poder instalarla.
            </p>
          </div>
        )}

        <Tabs defaultValue={defaultTab} className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="ios">
              <Apple className="size-3.5" />
              iOS
            </TabsTrigger>
            <TabsTrigger value="android">
              <Smartphone className="size-3.5" />
              Android
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ios" className="mt-4">
            {isChromeOnIOS ? (
              <div className="flex items-start gap-3 rounded-[16px] border border-white/10 bg-white/[0.03] p-4">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
                <div>
                  <p className="text-sm font-semibold">Abre en Safari para instalar</p>
                  <p className="mt-1 text-xs text-white/55">
                    En iPhone solo Safari permite agregar apps a la pantalla de inicio. Copia el
                    enlace y ábrelo en Safari.
                  </p>
                </div>
              </div>
            ) : (
              <ol className="space-y-3">
                <Step
                  index={1}
                  icon={<Share2 className="size-4" />}
                  title="Toca el botón Compartir"
                  desc="Está en la barra inferior de Safari (un cuadrado con una flecha hacia arriba)."
                />
                <Step
                  index={2}
                  icon={<Plus className="size-4" />}
                  title='Elige "Añadir a la pantalla de inicio"'
                  desc="Desplázate hacia abajo si no lo ves al instante."
                />
                <Step
                  index={3}
                  icon={<ArrowDown className="size-4" />}
                  title='Confirma "Añadir"'
                  desc="El ícono de NightPass aparecerá en tu pantalla de inicio."
                />
              </ol>
            )}
          </TabsContent>

          <TabsContent value="android" className="mt-4">
            {canInstall ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-white/65">
                  Tu navegador permite instalar NightPass directamente. Solo presiona el botón.
                </p>
                <Button
                  onClick={handlePromptInstall}
                  disabled={busy}
                  className="h-11 w-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] hover:opacity-95"
                >
                  <Download className="size-4" />
                  Instalar ahora
                </Button>
              </div>
            ) : (
              <ol className="space-y-3">
                <Step
                  index={1}
                  icon={<Smartphone className="size-4" />}
                  title="Abre el menú del navegador"
                  desc="Los tres puntos en la esquina superior derecha de Chrome."
                />
                <Step
                  index={2}
                  icon={<Plus className="size-4" />}
                  title='Toca "Instalar app" o "Añadir a inicio"'
                  desc="El nombre exacto depende de tu navegador."
                />
                <Step
                  index={3}
                  icon={<ArrowDown className="size-4" />}
                  title="Confirma la instalación"
                  desc="NightPass se abrirá como app nativa, sin barra del navegador."
                />
              </ol>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Step({
  index,
  icon,
  title,
  desc,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-[16px] border border-white/8 bg-white/[0.025] p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <span className="text-[11px] font-semibold">{index}</span>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <span className="text-primary">{icon}</span>
          {title}
        </p>
        <p className="mt-0.5 text-xs text-white/55">{desc}</p>
      </div>
    </li>
  );
}
