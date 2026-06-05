'use client';

import * as React from 'react';

/** Evento no estándar de Chromium para disparar la instalación nativa. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Captura temprana: `beforeinstallprompt` se dispara apenas carga la página, a
// menudo ANTES de que monte React. Si solo escucháramos dentro del efecto, lo
// perderíamos y nunca saldría el botón "Instalar". Por eso lo capturamos a nivel
// módulo (se ejecuta al cargar el bundle) y avisamos a los hooks suscritos.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    promptListeners.forEach((fn) => fn());
  });
}

type Platform = 'ios' | 'android' | 'desktop' | 'other';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  // iPadOS 13+ se reporta como Mac con touch.
  if (/macintosh/i.test(ua) && 'ontouchend' in document) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/windows|macintosh|linux/i.test(ua)) return 'desktop';
  return 'other';
}

function isIosUA(ua: string): boolean {
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)
  );
}

/**
 * ¿Es Safari en iOS? Safari instala la PWA vía Compartir → Agregar a inicio.
 * Excluye Chrome (CriOS), Firefox (FxiOS), Edge (EdgiOS), Opera (OPiOS), etc.
 */
function detectIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (!isIosUA(ua)) return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS|mercury|GSA/i.test(ua);
}

/**
 * ¿Es Chrome en iOS (CriOS)? También puede "Agregar a inicio" desde su propio
 * menú, con un flujo distinto a Safari → le mostramos su propio video.
 */
function detectIosChrome(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (!isIosUA(ua)) return false;
  return /CriOS/i.test(ua);
}

/** ¿La app corre como PWA instalada (standalone), no como pestaña? */
function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mql = window.matchMedia?.('(display-mode: standalone)').matches;
  // iOS Safari expone navigator.standalone en vez de display-mode.
  const iosStandalone = (navigator as { standalone?: boolean }).standalone === true;
  return Boolean(mql || iosStandalone);
}

/**
 * Estado de instalación de la PWA. Sirve para mostrar primero "instala la app"
 * y posponer los permisos (notificaciones) hasta que ya esté instalada.
 *
 * - `isStandalone`: corre instalada → ya podemos pedir permisos.
 * - `canPrompt`: el navegador permite disparar la instalación nativa (Android
 *   Chrome capturó `beforeinstallprompt`). En iOS siempre es false → instrucciones.
 * - `promptInstall()`: dispara el diálogo nativo si está disponible.
 */
export function usePwaInstall() {
  const [checked, setChecked] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [platform, setPlatform] = React.useState<Platform>('other');
  const [iosSafari, setIosSafari] = React.useState(false);
  const [iosChrome, setIosChrome] = React.useState(false);
  // Lee el singleton: si el evento ya se capturó (antes de montar), arranca true.
  const [canPrompt, setCanPrompt] = React.useState(false);

  React.useEffect(() => {
    setPlatform(detectPlatform());
    setIosSafari(detectIosSafari());
    setIosChrome(detectIosChrome());
    setIsStandalone(detectStandalone());
    setChecked(true);

    // Sincroniza con el singleton (puede que el prompt ya se haya capturado
    // antes de montar este hook) y reacciona a capturas/instalaciones futuras.
    const sync = () => {
      setCanPrompt(Boolean(deferredPrompt));
      if (!deferredPrompt) setIsStandalone(detectStandalone());
    };
    sync();
    promptListeners.add(sync);

    // Cambio de display-mode (instala/desinstala) sin recargar.
    const mql = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayChange = () => setIsStandalone(detectStandalone());
    mql?.addEventListener?.('change', onDisplayChange);

    return () => {
      promptListeners.delete(sync);
      mql?.removeEventListener?.('change', onDisplayChange);
    };
  }, []);

  const promptInstall = React.useCallback(async (): Promise<boolean> => {
    const ev = deferredPrompt;
    if (!ev) return false;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    deferredPrompt = null;
    setCanPrompt(false);
    return outcome === 'accepted';
  }, []);

  return { checked, isStandalone, canPrompt, platform, iosSafari, iosChrome, promptInstall };
}
