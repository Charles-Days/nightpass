'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Loader2, Printer, QrCode, RefreshCw } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { useRotateCheckinQr } from '../hooks/use-rotate-checkin-qr';

interface CheckinQrPanelProps {
  venueId: string;
  venueName: string;
  venueCity?: string | null;
}

function downloadSvg(svgEl: SVGSVGElement | null, filename: string) {
  if (!svgEl) return;
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svgEl);
  const blob = new Blob(
    ['<?xml version="1.0" standalone="no"?>\n', source],
    { type: 'image/svg+xml;charset=utf-8' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Opens a new window with a print-ready letter-size poster that the venue
 * can save as PDF or send to a physical printer. Uses inline styles so the
 * popup needs zero CSS files; auto-fires the print dialog after render.
 */
function openPrintablePoster(opts: {
  svgEl: SVGSVGElement | null;
  venueName: string;
  venueCity?: string | null;
}) {
  if (!opts.svgEl) return;

  const serializer = new XMLSerializer();
  const svgSource = serializer.serializeToString(opts.svgEl);

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>NightPass · Check-in ${escape(opts.venueName)}</title>
<style>
  @page { size: letter portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: #ffffff;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    color: #0a0712;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 100%;
    min-height: 100vh;
    padding: 56px 64px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: space-between;
    text-align: center;
  }
  .brand {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 28px; font-weight: 700; letter-spacing: -0.025em;
    background: linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #9333ea 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent; color: #a855f7;
  }
  .eyebrow {
    margin-top: 32px;
    font-size: 12px; font-weight: 600;
    letter-spacing: 0.28em; text-transform: uppercase;
    color: #a855f7;
  }
  h1 {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    margin: 14px 0 6px;
    font-size: 56px; font-weight: 700; letter-spacing: -0.035em;
    line-height: 1.05; color: #0a0712;
    max-width: 560px;
  }
  .city {
    font-size: 18px; color: #52525b; font-weight: 500;
    letter-spacing: 0.02em;
  }
  .qr {
    margin: 36px 0;
    padding: 28px;
    border-radius: 28px;
    background: #ffffff;
    border: 3px solid #0a0712;
    box-shadow: 0 24px 50px -16px rgba(168,85,247,0.35);
  }
  .qr svg { display: block; width: 320px; height: 320px; }
  .cta {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 26px; font-weight: 700; letter-spacing: -0.02em;
    color: #0a0712; margin: 8px 0 4px;
  }
  .cta strong { color: #9333ea; }
  .sub {
    font-size: 15px; color: #52525b; max-width: 460px;
    line-height: 1.5; margin: 0 0 10px;
  }
  .perks {
    display: flex; gap: 32px; margin: 18px 0 0;
    font-size: 13px; color: #71717a;
  }
  .perks span { display: inline-flex; align-items: center; gap: 6px; }
  .perks strong { color: #a855f7; font-weight: 700; }
  .footer {
    margin-top: 48px;
    width: 100%;
    border-top: 1px solid #e4e4e7;
    padding-top: 18px;
    display: flex; justify-content: space-between;
    font-size: 11px; letter-spacing: 0.08em;
    text-transform: uppercase; color: #a1a1aa;
  }
  @media print {
    .page { min-height: auto; height: 100vh; }
  }
</style>
</head>
<body>
  <div class="page">
    <div>
      <div class="brand">NightPass</div>
      <div class="eyebrow">Check-in · Acumula puntos</div>
      <h1>${escape(opts.venueName)}</h1>
      ${opts.venueCity ? `<p class="city">${escape(opts.venueCity)}</p>` : ''}
    </div>

    <div class="qr">${svgSource}</div>

    <div>
      <p class="cta">Escanea para <strong>+10 NPP</strong></p>
      <p class="sub">
        Abre la app NightPass · sección Recompensas · Escanear QR.
        Acumula puntos cada noche que vienes.
      </p>
      <div class="perks">
        <span><strong>+10</strong> NPP por visita</span>
        <span><strong>1x</strong> al día</span>
        <span><strong>+15</strong> primer visita</span>
      </div>
    </div>

    <div class="footer">
      <span>nightpass.mx</span>
      <span>${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: '2-digit' })}</span>
    </div>
  </div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 250);
    });
  </script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=800,height=1000');
  if (!w) {
    alert('Activa los popups del navegador para imprimir.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function CheckinQrPanel({ venueId, venueName, venueCity }: CheckinQrPanelProps) {
  const rotate = useRotateCheckinQr(venueId);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const data = rotate.data;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Genera un QR para imprimir en la entrada. Los clientes lo escanean
        desde la app para acumular puntos NightPass (+10 NPP máx 1 vez al día
        por bar).
      </p>

      {!data ? (
        <div className="flex flex-col items-start gap-3 rounded-[18px] border border-dashed border-white/15 bg-white/[0.015] p-5">
          <QrCode className="size-6 text-primary" />
          <p className="text-sm">
            Aún no tienes un QR de check-in para este local.
          </p>
          <Button
            type="button"
            onClick={() => rotate.mutate()}
            disabled={rotate.isPending}
            className="rounded-full"
          >
            {rotate.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <QrCode className="mr-2 size-4" />
            )}
            Generar QR
          </Button>
        </div>
      ) : (
        <div className="rounded-[18px] border border-white/10 bg-white/[0.025] p-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="rounded-xl bg-white p-3">
              <QRCodeSVG
                ref={svgRef}
                value={data.scanUrl ?? data.payload}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-3 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Generado
                </p>
                <p className="mt-1 font-mono text-xs text-white/75">
                  {formatDate(data.issuedAt)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Link de escaneo
                </p>
                <p className="mt-1 truncate font-mono text-[11px] text-white/55">
                  {data.scanUrl ?? data.payload}
                </p>
                <p className="mt-1.5 text-[11px] text-emerald-300/75">
                  Funciona con la cámara nativa del celular — abre la app web y procesa el check-in.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_8px_24px_-8px_rgba(168,85,247,0.55)] hover:from-[#7e22ce] hover:to-[#9333ea]"
                  onClick={() =>
                    openPrintablePoster({
                      svgEl: svgRef.current,
                      venueName,
                      venueCity,
                    })
                  }
                >
                  <Printer className="mr-1.5 size-3.5" /> Imprimir / PDF
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() =>
                    downloadSvg(svgRef.current, `checkin-${venueId}.svg`)
                  }
                >
                  <Download className="mr-1.5 size-3.5" /> Solo QR (SVG)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={rotate.isPending}
                  onClick={() => rotate.mutate()}
                >
                  {rotate.isPending ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 size-3.5" />
                  )}
                  Rotar QR
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[14px] border border-amber-400/20 bg-amber-500/[0.06] p-4 text-xs leading-relaxed text-amber-100/80">
        Imprime este código y pégalo en la entrada del local. Si crees que se
        filtró (alguien lo está usando sin estar dentro del bar), rótalo
        ahora: el QR anterior dejará de funcionar al instante.
      </div>
    </div>
  );
}
