'use client';

import { QRCodeSVG } from 'qrcode.react';

interface PassQRProps {
  value: string;
  usedAt: string | null;
}

export function PassQR({ value, usedAt }: PassQRProps) {
  const isUsed = Boolean(usedAt);

  return (
    <div className="relative mx-auto w-full max-w-xs rounded-[24px] bg-white p-4 shadow-[0_20px_60px_-10px_rgba(168,85,247,0.4)] sm:p-6">
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
          <div className="absolute inset-0 flex items-center justify-center rounded-[12px] bg-red-600/55 backdrop-blur-[2px]">
            <span className="-rotate-[18deg] rounded-md border-4 border-white px-5 py-1.5 font-display text-2xl font-extrabold uppercase tracking-[0.28em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)] sm:text-3xl">
              Usado
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
