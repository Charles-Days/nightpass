'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/core/components/analytics-tracker';
import { WarpOverlay } from '@/app/(customer)/_components/warp-overlay';

interface Props {
  href: string;
  eventId: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Botón "Comprar" de un tier. Al tocarlo dispara la transición warp (túnel a
 * otra galaxia) y, al terminar, navega al checkout. Registra el paso `click_buy`
 * del embudo antes de navegar, para distinguir "no tocan" de "tocan pero el
 * login los corta" (si tocan pero no llegan a open_checkout = el redirect a
 * login pesa).
 */
export function BuyTierButton({ href, eventId, className, children }: Props) {
  const router = useRouter();
  const [warping, setWarping] = useState(false);

  // Prefetch del checkout para que, al acabar el warp, la pantalla ya esté lista.
  useEffect(() => {
    router.prefetch(href as never);
  }, [router, href]);

  const handleClick = () => {
    if (warping) return;
    trackEvent('click_buy', eventId);
    setWarping(true);
  };

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        {children}
      </button>
      {warping && <WarpOverlay onComplete={() => router.push(href as never)} />}
    </>
  );
}
