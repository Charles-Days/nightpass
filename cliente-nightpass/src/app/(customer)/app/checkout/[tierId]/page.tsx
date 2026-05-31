import { redirect } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { CatalogTierDetail, Pass, User } from '@/core/types/api';
import { CheckoutClient } from './_components/checkout-client';

export const metadata = { title: 'Comprar pase — NightPass' };

interface Props {
  params: Promise<{ tierId: string }>;
}

export default async function CheckoutPage({ params }: Props) {
  const { tierId } = await params;

  try {
    await serverFetch<User>('/auth/me');
  } catch (error) {
    if (error instanceof ServerApiError && (error.status === 401 || error.status === 403)) {
      redirect(`${paths.iniciarSesion}?from=${paths.checkout}/${tierId}`);
    }
    throw error;
  }

  let initialTier: CatalogTierDetail | null = null;
  try {
    initialTier = await serverFetch<CatalogTierDetail>(`/catalog/tiers/${tierId}`);
  } catch {
    initialTier = null;
  }

  // Cuántos pases ya tiene el user para este evento — capa el selector de
  // cantidad (máximo 6 por cuenta) y evita el 409 LIMIT_EXCEEDED del backend.
  let alreadyOwned = 0;
  const eventId = initialTier?.event?.id;
  if (eventId) {
    try {
      const passes = await serverFetch<Pass[]>('/passes/me');
      alreadyOwned = passes.filter((p) => p.eventId === eventId).length;
    } catch {
      alreadyOwned = 0;
    }
  }

  return (
    <CheckoutClient
      tierId={tierId}
      initialTier={initialTier}
      alreadyOwned={alreadyOwned}
    />
  );
}
