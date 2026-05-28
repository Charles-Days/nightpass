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

  // iOS 16.4+ permite Add-to-Home-Screen tambien desde Chrome/Edge/Firefox/Orion
  // via Share del URL bar. No bloqueamos Chrome iOS — solo Firefox sigue sin
  // soportar manifest-based install. In-app browsers (Instagram/TikTok) sí
  // estan bloqueados — no exponen el menu Share completo.
  const isFirefoxOnIOS = platform.os === 'ios' && platform.browser === 'firefox';

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
              Estás dentro de otra app (Instagram, TikTok, Facebook…). Tocá los{' '}
              <strong>tres puntos</strong> arriba a la derecha y elegí{' '}
              <strong>"Abrir en el navegador"</strong>{' '}
              ({platform.os === 'ios' ? 'Safari, Chrome o Edge' : 'Chrome'}) para
              poder instalar NightPass.
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
            {isFirefoxOnIOS ? (
              <div className="flex items-start gap-3 rounded-[16px] border border-white/10 bg-white/[0.03] p-4">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
                <div>
                  <p className="text-sm font-semibold">Abre en Safari, Chrome o Edge</p>
                  <p className="mt-1 text-xs text-white/55">
                    Firefox en iPhone aún no permite instalar apps web. Copia el enlace y ábrelo
                    en Safari, Chrome o Edge para instalar NightPass.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <ol className="space-y-3">
                  <Step
                    index={1}
                    icon={<Share2 className="size-4" />}
                    title="Tocá el botón Compartir"
                    desc={
                      platform.browser === 'safari'
                        ? 'Cuadrado con flecha hacia arriba. En iPhone vertical está abajo; en iPad o paisaje, arriba a la derecha. Si no lo ves, abrí el menú "aA" o los tres puntos al lado de la URL y elegí "Compartir".'
                        : 'En la barra de direcciones, a la derecha de la URL. Cuadrado con flecha hacia arriba. Si no aparece directo, abrí los tres puntos del navegador y elegí "Compartir". Requiere iOS 16.4 o más reciente.'
                    }
                  />
                  <Step
                    index={2}
                    icon={<ArrowDown className="size-4" />}
                    title='Tocá "Ver más" para expandir'
                    desc='Abajo del todo de la hoja Compartir hay un botón "Ver más" (con un chevron ↓). Tocalo para ver todas las opciones — la primera vista no muestra "Añadir a inicio".'
                  />
                  <Step
                    index={3}
                    icon={<Plus className="size-4" />}
                    title='Elegí "Añadir a pantalla de inicio"'
                    desc='Está abajo, después de "Imprimir". Tiene un ícono ⊞ con un más.'
                  />
                  <Step
                    index={4}
                    icon={<Apple className="size-4" />}
                    title='Confirmá "Agregar"'
                    desc='Botón azul arriba a la derecha. Dejá activado el toggle "Abrir como app web" (en iOS 26 viene por default).'
                  />
                  <Step
                    index={5}
                    icon={<Smartphone className="size-4" />}
                    title="Abrí desde el ícono del home"
                    desc="Salí del navegador y tocá el ícono morado de NightPass en tu pantalla de inicio. Así abre como app, sin barra del navegador."
                  />
                </ol>
                <p className="mt-3 text-[11px] text-white/45">
                  ¿No aparece la opción aún después de "Ver más"? Recargá la página, esperá 2
                  segundos y volvé a tocar Compartir.
                </p>
              </>
            )}
          </TabsContent>

          <TabsContent value="android" className="mt-4">
            {canInstall ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-white/65">
                  Tu navegador permite instalar NightPass directamente. Solo presioná el botón.
                </p>
                <Button
                  onClick={handlePromptInstall}
                  disabled={busy}
                  className="h-11 w-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] hover:opacity-95"
                >
                  <Download className="size-4" />
                  Instalar ahora
                </Button>
                <p className="text-[11px] text-white/45">
                  Si el botón no responde, abrí el menú del navegador (tres puntos) y elegí
                  "Instalar app".
                </p>
              </div>
            ) : (
              <>
                <ol className="space-y-3">
                  <Step
                    index={1}
                    icon={<Smartphone className="size-4" />}
                    title="Abrí el menú del navegador"
                    desc={
                      platform.browser === 'samsung'
                        ? 'Tres líneas abajo a la derecha (Samsung Internet).'
                        : platform.browser === 'firefox'
                          ? 'Tres puntos abajo a la derecha (Firefox).'
                          : 'Tres puntos arriba a la derecha en Chrome o Edge.'
                    }
                  />
                  <Step
                    index={2}
                    icon={<Plus className="size-4" />}
                    title='Tocá "Instalar app" o "Agregar a inicio"'
                    desc={
                      platform.browser === 'samsung'
                        ? 'En Samsung Internet aparece como "Agregar página a" → "Pantalla de inicio".'
                        : platform.browser === 'firefox'
                          ? 'En Firefox aparece como "Instalar" o "Agregar a pantalla de inicio".'
                          : 'En Chrome dice "Instalar app". En Edge dice "Agregar a teléfono".'
                    }
                  />
                  <Step
                    index={3}
                    icon={<ArrowDown className="size-4" />}
                    title="Confirmá la instalación"
                    desc='Tap "Instalar" en el popup. Vas a ver una notificación cuando termine.'
                  />
                  <Step
                    index={4}
                    icon={<Smartphone className="size-4" />}
                    title="Abrí desde el ícono o el cajón de apps"
                    desc="NightPass aparece en tu pantalla de inicio y en el cajón. Abrí desde ahí — ya no necesitás el navegador."
                  />
                </ol>
                <p className="mt-3 text-[11px] text-white/45">
                  ¿No aparece la opción? Recargá esta página, esperá 2 segundos. Si seguís sin
                  verla, actualizá tu navegador a la última versión.
                </p>
              </>
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
