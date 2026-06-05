'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePlatform } from '../hooks/use-platform';
import { useInstallPrompt } from '../hooks/use-install-prompt';
import { InstallTutorial } from './install-tutorial';

const DISMISS_KEY = 'np_install_dismissed';

export function InstallBanner() {
  const platform = usePlatform();
  const { canInstall, installed } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const v = window.localStorage.getItem(DISMISS_KEY);
      setDismissed(v === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (platform.standalone || installed || dismissed) return null;

  // Show banner if we can install (Android Chrome) OR on iOS where install is manual via tutorial.
  const shouldShow = canInstall || platform.os === 'ios';
  if (!shouldShow) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="mx-auto mb-4 flex w-full max-w-6xl items-center gap-3 rounded-full border border-white/14 bg-white/[0.07] px-4 py-2 text-xs backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-1 items-center gap-2 text-left text-white/75 transition hover:text-white"
        >
          <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_16px_rgba(168,85,247,0.4)]">
            <Download className="size-3.5" />
          </span>
          <span className="font-medium">Instalar NightPass como app</span>
        </button>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={handleDismiss}
          className="grid size-6 place-items-center rounded-full text-white/45 transition hover:bg-white/[0.09] hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <InstallTutorial open={open} onOpenChange={setOpen} />
    </>
  );
}
