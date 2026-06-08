'use client';

import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface PassQRProps {
  value: string;
  usedAt: string | null;
}

/**
 * Mantiene la pantalla encendida (sin atenuarse) mientras se muestra el QR, para
 * que escanee fácil en la puerta. El navegador no permite subir el brillo del
 * hardware desde la web; esto es lo más cercano (Screen Wake Lock API).
 */
function useScreenWakeLock() {
  useEffect(() => {
    type Sentinel = { release: () => Promise<void> };
    const wl = (
      navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<Sentinel> };
      }
    ).wakeLock;
    if (!wl) return;

    let lock: Sentinel | null = null;
    const request = () => {
      wl.request('screen')
        .then((s) => {
          lock = s;
        })
        .catch(() => {
          // denegado o no disponible (p. ej. batería baja) → ignoramos
        });
    };
    request();
    // El lock se suelta al ocultar la pestaña; lo re-adquirimos al volver.
    const onVisible = () => {
      if (document.visibilityState === 'visible') request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
}

export function PassQR({ value, usedAt }: PassQRProps) {
  const isUsed = Boolean(usedAt);
  useScreenWakeLock();

  return (
    <div className="relative mx-auto w-full max-w-[280px] rounded-[24px] bg-white p-4 shadow-[0_20px_60px_-10px_rgba(168,85,247,0.4)] np-pop-in transform-gpu sm:max-w-xs sm:p-6">
      <div className="relative aspect-square w-full">
        <QRCodeSVG
          value={value}
          level="H"
          marginSize={2}
          bgColor="#FFFFFF"
          fgColor="#0A0A0F"
          className="size-full"
        />

        {isUsed && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[12px] bg-red-600/55 backdrop-blur-[2px] np-fade-in">
            <span className="-rotate-[18deg] rounded-md border-4 border-white px-5 py-1.5 font-display text-2xl font-extrabold uppercase tracking-[0.28em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)] np-pop-in sm:text-3xl">
              Usado
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
