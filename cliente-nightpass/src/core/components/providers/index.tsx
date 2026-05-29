'use client';

import * as React from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from './theme-provider';
import { QueryProvider } from './query-provider';
import { NPGoogleOAuthProvider } from './google-oauth-provider';
import { RefTracker } from './ref-tracker';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <NPGoogleOAuthProvider>
        <QueryProvider>
          <RefTracker />
          {children}
          <Toaster
            position="top-right"
            theme="dark"
            richColors
            closeButton
            // En iOS PWA standalone (statusBarStyle black-translucent + viewportFit
            // cover) el contenido se dibuja bajo la barra de estado / notch, así que
            // el toast caía encima del reloj. Lo empujamos con el safe-area-inset.
            offset={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
            mobileOffset={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
          />
        </QueryProvider>
      </NPGoogleOAuthProvider>
    </ThemeProvider>
  );
}
