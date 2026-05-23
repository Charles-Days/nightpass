import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Lock, MapPin } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import {
  LOYALTY_TIER_RANK,
  type CatalogEventDetail,
  type LoyaltyStatus,
  type LoyaltyTier,
} from '@/core/types/api';
import { TIER_STYLES } from '@/features/loyalty';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const ev = await serverFetch<CatalogEventDetail>(`/catalog/events/${id}`);
    return { title: `${ev.title} — NightPass`, description: ev.description ?? undefined };
  } catch {
    return { title: 'Evento — NightPass' };
  }
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatPrice(cents: number, currency: string) {
  const sym = currency.toLowerCase() === 'mxn' ? '$' : currency.toLowerCase() === 'eur' ? '€' : '$';
  return `${sym}${(cents / 100).toFixed(0)}${currency.toLowerCase() === 'mxn' ? ' MXN' : ''}`;
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  let event: CatalogEventDetail;
  try {
    event = await serverFetch<CatalogEventDetail>(`/catalog/events/${id}`);
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }

  // Try to fetch loyalty status to display tier-gate UX. If user is not
  // signed in or backend is not ready yet, the tier check is skipped and
  // the backend will still 403 on order creation.
  let userTier: LoyaltyTier | null = null;
  try {
    const loyalty = await serverFetch<LoyaltyStatus>('/me/loyalty');
    userTier = loyalty.tier;
  } catch {
    userTier = null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
      <Link
        href={`${paths.bar}/${event.venue.slug}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {event.venue.name}
      </Link>

      <section className="mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]">
        <div className="relative aspect-[16/9] bg-gradient-to-br from-purple-900/40 to-purple-600/10">
          {event.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverImageUrl}
              alt={event.title}
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <Calendar className="mr-1 inline size-3" />
              {formatDate(event.startsAt)}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              {event.title}
            </h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/75">
              <MapPin className="size-3.5" />
              {event.venue.name} · {event.venue.city}
            </p>
          </div>
        </div>

        {event.description && (
          <div className="border-t border-white/8 p-5 sm:p-7">
            <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-xl font-bold tracking-tight">Boletos</h2>
        {event.tiers.length === 0 ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-8 text-center text-sm text-muted-foreground">
            Aún no hay tiers disponibles.
          </div>
        ) : (
          <ul className="space-y-3">
            {event.tiers.map((tier) => {
              const requires = tier.minLoyaltyTier ?? null;
              const userRank = userTier ? LOYALTY_TIER_RANK[userTier] : 0;
              const requiredRank = requires ? LOYALTY_TIER_RANK[requires] : 0;
              const locked = !!requires && userRank < requiredRank;
              const requiredLabel = requires ? TIER_STYLES[requires].label : null;
              return (
                <li
                  key={tier.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-white/[0.025] p-4 sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-bold tracking-tight">
                        {tier.name}
                      </p>
                      {requires ? (
                        <span
                          className={
                            locked
                              ? 'inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200'
                              : 'inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70'
                          }
                        >
                          {locked ? <Lock className="size-2.5" /> : null}
                          {locked ? 'Requiere' : 'Tier'} {requiredLabel}
                          {!locked ? '+' : ''}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tier.capacity ? `${tier.capacity} lugares` : 'Sin límite'}
                    </p>
                    {locked ? (
                      <Link
                        href={paths.recompensas}
                        className="mt-2 inline-flex items-center text-[11px] font-semibold text-primary hover:underline"
                      >
                        ¿Cómo subo de tier? →
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg font-bold tabular-nums">
                      {formatPrice(tier.priceCents, tier.currency)}
                    </span>
                    {locked ? (
                      <span
                        aria-disabled
                        className="cursor-not-allowed rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/45"
                      >
                        Bloqueado
                      </span>
                    ) : (
                      <Link
                        href={`${paths.checkout}/${tier.id}`}
                        className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)] transition hover:brightness-110"
                      >
                        Comprar
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
