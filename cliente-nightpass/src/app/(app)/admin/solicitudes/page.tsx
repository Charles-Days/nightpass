import Link from 'next/link';
import { Building2, Megaphone } from 'lucide-react';
import { serverFetch } from '@/core/lib/api/server-client';
import type {
  ApplicationStatus,
  PaginatedApplications,
  PaginatedPromoterApplications,
} from '@/core/types/api';
import { ApplicationsTable } from '@/features/venue-applications/components/applications-table';
import { PromoterApplicationsTable } from '@/features/promoter-applications/components/promoter-applications-table';

export const metadata = { title: 'Solicitudes' };

type ApplicationType = 'local' | 'promotora';

interface PageProps {
  searchParams: Promise<{ status?: string; type?: string }>;
}

const STATUS_FILTERS: { value: ApplicationStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
  { value: 'ALL', label: 'Todas' },
];

function buildHref(type: ApplicationType, status: ApplicationStatus | 'ALL') {
  const qs = new URLSearchParams();
  if (type !== 'local') qs.set('type', type);
  if (status !== 'ALL') qs.set('status', status);
  const s = qs.toString();
  return s ? `/admin/solicitudes?${s}` : '/admin/solicitudes';
}

export default async function ApplicationsListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const type: ApplicationType = sp.type === 'promotora' ? 'promotora' : 'local';
  const filter = (sp.status as ApplicationStatus | 'ALL' | undefined) ?? 'PENDING';
  const queryString = filter === 'ALL' ? '' : `?status=${filter}`;

  // Fetch ambos para mostrar counts en los pills
  const [venueData, promoterData] = await Promise.all([
    type === 'local'
      ? serverFetch<PaginatedApplications>(`/venue-applications${queryString}`)
      : serverFetch<PaginatedApplications>(`/venue-applications?status=PENDING&limit=1`).catch(
          () => null,
        ),
    type === 'promotora'
      ? serverFetch<PaginatedPromoterApplications>(`/promoter-applications${queryString}`)
      : serverFetch<PaginatedPromoterApplications>(
          `/promoter-applications?status=PENDING&limit=1`,
        ).catch(() => null),
  ]);

  const venuePendingCount =
    type === 'local'
      ? filter === 'PENDING'
        ? (venueData as PaginatedApplications | null)?.total ?? 0
        : null
      : (venueData as PaginatedApplications | null)?.total ?? 0;

  const promoterPendingCount =
    type === 'promotora'
      ? filter === 'PENDING'
        ? (promoterData as PaginatedPromoterApplications | null)?.total ?? 0
        : null
      : (promoterData as PaginatedPromoterApplications | null)?.total ?? 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Solicitudes
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Revisa y aprueba
        </h1>
        <p className="text-sm text-muted-foreground">
          Locales y promotoras que quieren registrarse en NightPass.
        </p>
      </header>

      {/* Tabs primarios: Locales | Promotoras */}
      <div className="flex flex-wrap gap-2">
        <TypePill
          href={buildHref('local', 'PENDING')}
          active={type === 'local'}
          icon={<Building2 className="size-4" />}
          label="Locales"
          count={venuePendingCount}
        />
        <TypePill
          href={buildHref('promotora', 'PENDING')}
          active={type === 'promotora'}
          icon={<Megaphone className="size-4" />}
          label="Promotoras"
          count={promoterPendingCount}
        />
      </div>

      {/* Sub-tabs de estado */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <nav className="flex flex-nowrap gap-2 border-b pb-2 sm:flex-wrap">
          {STATUS_FILTERS.map((s) => {
            const active = filter === s.value;
            return (
              <Link
                key={s.value}
                href={buildHref(type, s.value)}
                className={
                  active
                    ? 'rounded-md bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary transition-colors duration-200'
                    : 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground'
                }
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {type === 'local' && venueData ? (
        <>
          <ApplicationsTable data={venueData as PaginatedApplications} />
          <p className="text-xs text-muted-foreground">
            {(venueData as PaginatedApplications).total} solicitudes · página{' '}
            {(venueData as PaginatedApplications).page}
          </p>
        </>
      ) : null}

      {type === 'promotora' && promoterData ? (
        <>
          <PromoterApplicationsTable data={promoterData as PaginatedPromoterApplications} />
          <p className="text-xs text-muted-foreground">
            {(promoterData as PaginatedPromoterApplications).total} solicitudes · página{' '}
            {(promoterData as PaginatedPromoterApplications).page}
          </p>
        </>
      ) : null}
    </div>
  );
}

function TypePill({
  href,
  active,
  icon,
  label,
  count,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number | null;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-1.5 text-sm font-medium text-primary transition-colors'
          : 'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground'
      }
    >
      {icon}
      <span>{label}</span>
      {count !== null && count > 0 ? (
        <span
          className={
            active
              ? 'rounded-full bg-primary/25 px-2 py-0.5 text-[11px] font-semibold text-primary'
              : 'rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-foreground/80'
          }
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
