import Link from 'next/link';
import Image from 'next/image';
import { Calendar, CheckCircle2, MapPin, QrCode, Ticket } from 'lucide-react';
import { serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { Pass } from '@/core/types/api';

export const metadata = {
  title: 'Mis pases — NightPass',
  description: 'Tus pases digitales con QR para entrar sin filas.',
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default async function PassesPage() {
  let passes: Pass[] = [];
  try {
    const data = await serverFetch<Pass[]>('/passes/me');
    passes = Array.isArray(data) ? data : [];
  } catch {
    passes = [];
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary np-rise">
        Tu noche · listo para entrar
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-4xl np-rise" style={{ animationDelay: '60ms' }}>
        Mis pases
      </h1>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground np-rise" style={{ animationDelay: '120ms' }}>
        Muestra el QR en la puerta y olvídate de las filas.
      </p>

      <Link
        href={paths.escanearPase}
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15 active:scale-95 np-rise"
        style={{ animationDelay: '150ms' }}
      >
        <QrCode className="size-4" />
        ¿Pagaste en efectivo? Escanear pase
      </Link>

      {passes.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-[22px] border border-white/10 bg-white/[0.025] p-10 text-center np-rise" style={{ animationDelay: '180ms' }}>
          <div className="grid size-14 place-items-center rounded-full border border-white/10 bg-white/[0.04] np-pop-in">
            <Ticket className="size-6 text-primary" />
          </div>
          <h2 className="mt-5 font-display text-lg font-bold tracking-tight">
            Aún no tienes pases
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Cuando compres un cover digital aparecerá aquí con su QR listo para escanear.
          </p>
          <Link
            href={paths.appHome}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)] transition hover:brightness-110 active:scale-95 transform-gpu"
          >
            Explorar bares
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {passes.map((pass, idx) => {
            const used = Boolean(pass.usedAt);
            const event = pass.event;
            const venue = event?.venue;
            return (
              <li key={pass.id} className="np-rise transform-gpu" style={{ animationDelay: `${Math.min(80 + idx * 40, 480)}ms` }}>
                <Link
                  href={`${paths.pases}/${pass.id}`}
                  className="flex items-stretch gap-4 rounded-[20px] border border-white/10 bg-white/[0.025] p-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.04] hover:border-white/15 active:scale-[0.98] transform-gpu sm:p-4"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[14px] bg-gradient-to-br from-purple-900/40 to-purple-600/10 sm:h-28 sm:w-32">
                    {event?.coverImageUrl ? (
                      <Image
                        src={event.coverImageUrl}
                        alt={event.title}
                        fill
                        sizes="128px"
                        loading="lazy"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-2xl text-white/30">
                        <Ticket className="size-7" />
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                    <h3 className="truncate font-display text-base font-bold leading-tight tracking-tight sm:text-lg">
                      {event?.title ?? 'Evento'}
                    </h3>
                    {venue && (
                      <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">
                          {venue.name} · {venue.city}
                        </span>
                      </p>
                    )}
                    {event?.startsAt && (
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                        <Calendar className="size-3 shrink-0" />
                        {formatDate(event.startsAt)}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center">
                    {used ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55 transition-colors">
                        <CheckCircle2 className="size-3" />
                        Usado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300 transition-colors">
                        <span className="size-1.5 rounded-full bg-emerald-400 np-dot-pulse-slow transform-gpu" />
                        Activo
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
