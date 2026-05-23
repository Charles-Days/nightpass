import Link from 'next/link';
import { MapPin, Music2 } from 'lucide-react';
import { paths } from '@/core/config/paths';
import type { CatalogVenueSummary } from '@/core/types/api';
import { VenueOccupancyBadge } from './venue-occupancy-badge';

function formatPrice(cents: number | null, currency: string | null) {
  if (cents == null) return null;
  const amount = (cents / 100).toFixed(0);
  const sym = currency?.toLowerCase() === 'mxn' ? '$' : currency?.toLowerCase() === 'eur' ? '€' : '$';
  return `${sym}${amount}${currency?.toLowerCase() === 'mxn' ? ' MXN' : ''}`;
}

export function VenueCard({ venue }: { venue: CatalogVenueSummary }) {
  const price = formatPrice(venue.priceFromCents, venue.currency);
  return (
    <Link
      href={`${paths.bar}/${venue.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025] transform-gpu transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_18px_40px_-20px_rgba(168,85,247,0.45)] active:scale-[0.97] active:duration-100"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-purple-900/40 to-purple-600/10">
        {venue.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={venue.coverImageUrl}
            alt={venue.name}
            className="absolute inset-0 size-full object-cover transform-gpu transition-transform duration-[600ms] ease-out group-hover:scale-[1.07]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-display text-3xl font-bold tracking-tight text-white/30">
              {venue.name[0]}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-4">
          <div>
            <h3 className="font-display text-lg font-bold leading-tight text-white">{venue.name}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
              <MapPin className="size-3" />
              {venue.city}
            </p>
            <div className="mt-1.5">
              <VenueOccupancyBadge venueId={venue.id} />
            </div>
          </div>
          {price && (
            <div className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
              desde {price}
            </div>
          )}
        </div>
      </div>

      {(venue.categories?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/8 p-3">
          {venue.categories?.slice(0, 3).map((c) => (
            <span
              key={c}
              className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white/70"
            >
              {c}
            </span>
          ))}
          {(venue.musicTypes?.length ?? 0) > 0 && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-white/55">
              <Music2 className="size-3" />
              {venue.musicTypes?.[0]}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
