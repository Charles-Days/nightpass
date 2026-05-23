'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { clientEnv } from '@/core/config/env';

interface NPGoogleOAuthProviderProps {
  children: React.ReactNode;
}

export function NPGoogleOAuthProvider({ children }: NPGoogleOAuthProviderProps) {
  const clientId = clientEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  // Sin client ID, omitir el provider para no romper render.
  // Las callbacks de google-login no se dispararán hasta que la env esté configurada.
  if (!clientId) return <>{children}</>;
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
