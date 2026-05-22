import { redirect } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { CatalogTierDetail, User } from '@/core/types/api';
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

  return <CheckoutClient tierId={tierId} initialTier={initialTier} />;
}
