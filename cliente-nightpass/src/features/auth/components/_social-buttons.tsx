'use client';

import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { clientEnv } from '@/core/config/env';
import { useGoogleSignin } from '../hooks/use-google-signin';

interface SocialButtonsProps {
  variant?: 'compact' | 'full';
}

export function SocialButtons({ variant = 'full' }: SocialButtonsProps) {
  const { mutate, isPending } = useGoogleSignin();
  const enabled = Boolean(clientEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => toast('Google sign-in se activa cuando NEXT_PUBLIC_GOOGLE_CLIENT_ID esté en .env')}
        aria-label="Continuar con Google"
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] font-semibold text-white/85 transition hover:bg-white/[0.07]"
      >
        <GoogleIcon />
        {variant === 'full' ? 'Continuar con Google' : 'Google'}
      </button>
    );
  }

  // Google fuerza el botón personalizado "Continuar como <X>" en fondo blanco
  // cuando el usuario ya está logged in en Google — su design system no permite
  // dark theme en esa variante. Render: GSI invisible centrado (atrapa el click
  // real, requerido para confiar el gesto del usuario) + custom dark visible
  // debajo full-width. Pointer-events-none en el visual deja pasar el click al GSI.
  return (
    <div
      className={`relative flex h-12 w-full items-center justify-center ${isPending ? 'pointer-events-none opacity-60' : ''}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 text-[13px] font-semibold text-white/90"
      >
        <GoogleIcon />
        {variant === 'full' ? 'Continuar con Google' : 'Google'}
      </div>
      <div className="relative z-10 opacity-0">
        <GoogleLogin
          onSuccess={(resp) => {
            if (resp.credential) mutate(resp.credential);
          }}
          onError={() => {
            toast.error('No pudimos iniciar con Google. Intenta de nuevo.');
          }}
          theme="filled_black"
          shape="pill"
          text={variant === 'full' ? 'continue_with' : 'signin_with'}
          size="large"
          width="320"
        />
      </div>
    </div>
  );
}

export function OrDivider({ label = 'o con email' }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
      <span className="h-px flex-1 bg-white/10" />
      {label}
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M21.6 12.227c0-.708-.064-1.39-.182-2.045H12v3.868h5.382a4.605 4.605 0 0 1-1.996 3.022v2.51h3.232c1.891-1.741 2.982-4.305 2.982-7.355z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.964-.895 6.618-2.418l-3.232-2.51c-.895.6-2.04.954-3.386.954-2.605 0-4.81-1.759-5.596-4.123H3.064v2.59A9.996 9.996 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.404 13.903A5.998 5.998 0 0 1 6.09 12c0-.66.114-1.302.314-1.903v-2.59H3.064A9.996 9.996 0 0 0 2 12c0 1.614.386 3.14 1.064 4.493l3.34-2.59z"
      />
      <path
        fill="#EA4335"
        d="M12 5.977c1.47 0 2.787.505 3.824 1.498l2.868-2.868C16.96 2.99 14.695 2 12 2 8.09 2 4.71 4.197 3.064 7.507l3.34 2.59C7.19 7.735 9.395 5.977 12 5.977z"
      />
    </svg>
  );
}
