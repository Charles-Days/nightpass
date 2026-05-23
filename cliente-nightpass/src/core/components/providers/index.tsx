'use client';

import * as React from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from './theme-provider';
import { QueryProvider } from './query-provider';
import { NPGoogleOAuthProvider } from './google-oauth-provider';

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
          {children}
          <Toaster position="top-right" theme="dark" richColors closeButton />
        </QueryProvider>
      </NPGoogleOAuthProvider>
    </ThemeProvider>
  );
}
