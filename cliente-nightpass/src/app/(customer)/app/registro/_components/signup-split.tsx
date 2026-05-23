'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { paths } from '@/core/config/paths';
import { CustomerSignupForm } from '@/features/auth';
import { SignupPreview } from '@/features/auth/components/_signup-preview';

export function SignupSplit() {
  const [name, setName] = useState('');

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-10 lg:py-14">
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
        {/* FORM */}
        <div className="mx-auto w-full max-w-md lg:mx-0">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-primary np-rise">
            Únete en segundos
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-[0.95] tracking-[-0.035em] np-rise sm:text-5xl" style={{ animationDelay: '60ms' }}>
            Crear tu cuenta{' '}
            <span className="font-serif italic font-normal text-violet-200">
              NightPass.
            </span>
          </h1>
          <p className="mt-3.5 text-[15px] leading-[1.55] text-white/55 np-rise" style={{ animationDelay: '120ms' }}>
            Sin filas, sin efectivo. Empieza a entrar con un QR esta misma noche.
          </p>

          <div className="mt-8 np-rise" style={{ animationDelay: '180ms' }}>
            <Suspense
              fallback={
                <div className="h-[480px] animate-pulse rounded-[18px] bg-white/[0.04]" />
              }
            >
              <CustomerSignupForm onNameChange={setName} />
            </Suspense>
          </div>

          <p className="mt-6 text-center text-sm text-white/60 np-rise lg:text-left" style={{ animationDelay: '340ms' }}>
            ¿Ya tienes cuenta?{' '}
            <Link
              href={paths.iniciarSesion}
              className="font-semibold text-primary transition-colors hover:underline active:scale-95 inline-block transform-gpu"
            >
              Entrar
            </Link>
          </p>
        </div>

        {/* PREVIEW */}
        <div className="hidden np-zoom-in lg:block" style={{ animationDelay: '160ms' }}>
          <SignupPreview name={name} />
        </div>
      </div>

      {/* PROOF STRIP */}
      <section className="mt-14 border-t border-white/10 pt-7 lg:mt-20">
        <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
          {[
            { k: '+2,400', l: 'personas ya entran sin fila' },
            { k: '★ 4.8', l: 'rating en App Store' },
            { k: '0 min', l: 'espera promedio' },
            { k: '100%', l: 'pago seguro o devolución' },
          ].map((s, i, arr) => (
            <div
              key={s.l}
              className={`np-rise transform-gpu px-6 text-center first:text-left sm:text-center ${i < arr.length - 1 ? 'sm:border-r sm:border-white/10' : ''}`}
              style={{ animationDelay: `${400 + i * 70}ms` }}
            >
              <p className="font-display text-[26px] font-bold tracking-[-0.025em] sm:text-3xl">
                {s.k}
              </p>
              <p className="mt-1.5 text-xs text-white/55">{s.l}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
