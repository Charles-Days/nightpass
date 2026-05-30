import { absoluteUrl } from '@/core/config/env';
import { ClaimScanner } from '../../_components/claim-scanner';

const title = 'Escanear pase — NightPass';
const description = 'Escanea el QR de tu RP para recibir tu pase digital al instante.';

export const metadata = {
  title,
  description,
  alternates: { canonical: '/app/escanear' },
  openGraph: { title, description, url: absoluteUrl('/app/escanear'), type: 'website' },
  robots: { index: false },
};

export default function EscanearPage() {
  return (
    <div className="mx-auto w-full max-w-md px-5 pb-5 pt-8 sm:px-8 sm:pb-7 sm:pt-9">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Pases</p>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Escanea tu pase
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        Si pagaste tu entrada en efectivo, tu RP te mostrará un código QR. Escanéalo aquí y tu pase
        digital quedará guardado en “Mis pases” con su QR para entrar.
      </p>

      <div className="mt-6">
        <ClaimScanner />
      </div>
    </div>
  );
}
