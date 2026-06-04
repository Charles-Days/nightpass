import { redirect } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import { StripeConnectCard } from '@/features/stripe';
import { CashWalletCard } from '@/features/cash-wallet';
import type { Promoter, User } from '@/core/types/api';

export const metadata = { title: 'Pagos · Mi organizador' };

export default async function PagosOrganizadorPage() {
  let user: User;
  try {
    user = await serverFetch<User>('/auth/me', { revalidate: 60 });
  } catch (err) {
    if (err instanceof ServerApiError && (err.status === 401 || err.status === 403)) {
      redirect(paths.login);
    }
    throw err;
  }

  // Solo el dueño del organizador gestiona pagos. Admin pasa para soporte;
  // el staff queda bloqueado para que no toque la cuenta bancaria.
  if (user.role !== 'PROMOTER' && user.role !== 'ADMIN') {
    redirect(paths.miOrganizador);
  }

  // El saldo en efectivo es por organizador; lo cargamos solo para el dueño.
  // /promoters/me responde { promoter, membershipRole } — no el promoter directo.
  let promoterId: string | null = null;
  if (user.role === 'PROMOTER') {
    try {
      const res = await serverFetch<{ promoter: Promoter }>('/promoters/me', {
        revalidate: 60,
      });
      promoterId = res?.promoter?.id ?? null;
    } catch {
      promoterId = null;
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Mi organizador · Pagos
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Cobra tus eventos con Stripe
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Conecta tu cuenta Stripe Express para recibir pagos. NightPass cobra
          8% de comisión por venta.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <StripeConnectCard mode="promoter" title="Cuenta Stripe del organizador" />

        <aside className="rounded-[22px] border border-white/14 bg-white/[0.05] p-5">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Cómo funciona
            </h2>
          </div>
          <ol className="space-y-4 text-sm text-foreground/80">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-xs font-bold text-primary">
                1
              </span>
              <p>
                <span className="font-semibold text-foreground">Conectas tu cuenta.</span>{' '}
                Da clic en <em className="not-italic text-primary">Conectar Stripe</em> y te
                llevamos al onboarding seguro de Stripe Express.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-xs font-bold text-primary">
                2
              </span>
              <p>
                <span className="font-semibold text-foreground">Llenas tus datos.</span>{' '}
                Identidad, comprobante fiscal y cuenta de banco directo con Stripe — nosotros
                nunca vemos esos datos.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-xs font-bold text-primary">
                3
              </span>
              <p>
                <span className="font-semibold text-foreground">Cobras directo.</span>{' '}
                Cada venta de pase llega a tu cuenta. NightPass retira el 8% de comisión
                automáticamente — sin trámites de tu lado.
              </p>
            </li>
          </ol>
        </aside>
      </section>

      {promoterId ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              Ventas en efectivo
            </h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              El efectivo no pasa por Stripe, así que la comisión de NightPass se
              cobra de un saldo prepagado. Recárgalo para que tus vendedores puedan
              confirmar pases pagados en efectivo.
            </p>
          </div>
          <div className="max-w-xl">
            <CashWalletCard owner={{ promoterId }} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
