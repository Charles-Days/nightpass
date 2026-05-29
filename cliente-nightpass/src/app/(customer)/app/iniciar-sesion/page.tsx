import { Suspense } from 'react';
import Link from 'next/link';
import { paths } from '@/core/config/paths';
import { CustomerLoginForm } from '@/features/auth';

export const metadata = { title: 'Entrar — NightPass' };

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  // Propaga `from` al link de registro: si el usuario llegó por un link RP y
  // decide crear cuenta, el código (anidado en from) sobrevive el cambio.
  const registroHref = from
    ? `${paths.registro}?from=${encodeURIComponent(from)}`
    : paths.registro;
  return (
    <div className="mx-auto w-full max-w-md px-5 py-10 sm:px-8 sm:py-14">
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-primary np-rise">
        Tu noche, tu pase
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold leading-[0.98] tracking-[-0.035em] np-rise sm:text-5xl" style={{ animationDelay: '60ms' }}>
        Entra a{' '}
        <span className="font-serif italic font-normal text-violet-200">NightPass.</span>
      </h1>
      <p className="mt-3.5 text-[15px] leading-[1.55] text-white/55 np-rise" style={{ animationDelay: '120ms' }}>
        Compra tu cover y guarda tus pases en un solo lugar.
      </p>

      <div className="mt-8 np-rise" style={{ animationDelay: '180ms' }}>
        <Suspense
          fallback={<div className="h-72 animate-pulse rounded-[18px] bg-white/[0.04]" />}
        >
          <CustomerLoginForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-sm text-white/60 np-rise" style={{ animationDelay: '260ms' }}>
        ¿No tienes cuenta?{' '}
        <Link href={registroHref as never} className="font-semibold text-primary transition-colors hover:underline active:scale-95 inline-block transform-gpu">
          Crear una
        </Link>
      </p>
      <p className="mt-3 text-center text-[11px] text-white/40 np-rise" style={{ animationDelay: '320ms' }}>
        ¿Eres dueño de un local?{' '}
        <Link href={paths.login} className="transition-colors hover:text-white/70">
          Entrar al panel
        </Link>
      </p>
    </div>
  );
}
