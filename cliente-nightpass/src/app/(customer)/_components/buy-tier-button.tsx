'use client';

import Link from 'next/link';
import { trackEvent } from '@/core/components/analytics-tracker';

interface Props {
  href: string;
  eventId: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Botón "Comprar" de un tier. Registra el paso `click_buy` del embudo antes de
 * navegar al checkout, para distinguir "no tocan" de "tocan pero el login los
 * corta" (si tocan pero no llegan a open_checkout = el redirect a login pesa).
 */
export function BuyTierButton({ href, eventId, className, children }: Props) {
  return (
    <Link
      href={href as never}
      onClick={() => trackEvent('click_buy', eventId)}
      className={className}
    >
      {children}
    </Link>
  );
}
