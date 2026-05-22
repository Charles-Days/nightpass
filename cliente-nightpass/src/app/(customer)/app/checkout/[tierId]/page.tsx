import { redirect } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { User } from '@/core/types/api';
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

  return <CheckoutClient tierId={tierId} />;
}
