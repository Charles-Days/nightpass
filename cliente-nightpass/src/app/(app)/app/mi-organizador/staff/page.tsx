import { notFound, redirect } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { PromoterMe } from '@/core/types/api';
import {
  PromoterStaffInviteForm,
  PromoterStaffList,
} from '@/features/promoters';

export const metadata = { title: 'Staff de la promotora' };

export default async function PromoterStaffPage() {
  let me: PromoterMe;
  try {
    me = await serverFetch<PromoterMe>('/promoters/me');
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 404) notFound();
    throw err;
  }

  if (me.membershipRole !== 'OWNER') {
    redirect(paths.miPromotora);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          {me.promoter.name}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Mi staff
        </h1>
        <p className="text-sm text-muted-foreground">
          Invita y gestiona al equipo de tu promotora.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-[22px] border border-white/10 bg-white/[0.025] p-6">
          <p className="mb-4 text-sm font-medium">Miembros actuales</p>
          <PromoterStaffList />
        </section>

        <section className="rounded-[22px] border border-white/10 bg-white/[0.025] p-6">
          <p className="mb-4 text-sm font-medium">Invitar nuevo miembro</p>
          <PromoterStaffInviteForm />
        </section>
      </div>
    </div>
  );
}
