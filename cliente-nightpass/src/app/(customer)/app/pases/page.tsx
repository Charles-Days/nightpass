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

  // Agrupar por evento — si compraste varios boletos de un mismo evento aparecen
  // juntos bajo su encabezado, y no se mezclan con los de otros eventos.
  // El backend ya devuelve los pases ordenados por fecha de evento (asc).
  const groups: Array<{ key: string; event: Pass['event']; passes: Pass[] }> = [];
  for (const pass of passes) {
    const key = pass.event?.id ?? pass.eventId;
    const existing = groups.find((g) => g.key === key);
    if (existing) existing.passes.push(pass);
    else groups.push({ key, event: pass.event, passes: [pass] });
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

      {passes.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-[22px] border border-white/14 bg-white/[0.05] p-10 text-center np-rise" style={{ animationDelay: '180ms' }}>
          <div className="grid size-14 place-items-center rounded-full border border-white/14 bg-white/[0.07] np-pop-in">
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
        <div className="mt-8 space-y-7">
          {groups.map((group, gIdx) => {
            const event = group.event;
            const venue = event?.venue;
            const multi = group.passes.length > 1;
            return (
              <section
                key={group.key}
                className="np-rise transform-gpu"
                style={{ animationDelay: `${Math.min(80 + gIdx * 60, 480)}ms` }}
              >
                {/* Encabezado del evento */}
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[16px] bg-gradient-to-br from-purple-900/40 to-purple-600/10 sm:h-24 sm:w-28">
                    {event?.coverImageUrl ? (
                      <Image
                        src={event.coverImageUrl}
                        alt={event.title}
                        fill
                        sizes="112px"
                        loading="lazy"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-white/30">
                        <Ticket className="size-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-display text-lg font-bold leading-tight tracking-tight sm:text-xl">
                        {event?.title ?? 'Evento'}
                      </h2>
                      {multi && (
                        <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                          {group.passes.length} boletos
                        </span>
                      )}
                    </div>
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
                </div>

                {/* Boletos del evento */}
                <ul className="mt-3 space-y-2">
                  {group.passes.map((pass, idx) => {
                    const used = Boolean(pass.usedAt);
                    return (
                      <li key={pass.id}>
                        <Link
                          href={`${paths.pases}/${pass.id}`}
                          className="flex items-center gap-3 rounded-[16px] border border-white/14 bg-white/[0.05] px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.07] hover:border-white/18 active:scale-[0.98] transform-gpu"
                        >
                          <QrCode className="size-4 shrink-0 text-primary" />
                          <span className="flex-1 truncate text-sm font-semibold">
                            {multi ? `Boleto ${idx + 1}` : 'Tu boleto'}
                          </span>
                          {used ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
                              <CheckCircle2 className="size-3" />
                              Usado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                              <span className="size-1.5 rounded-full bg-emerald-400 np-dot-pulse-slow transform-gpu" />
                              Activo
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
