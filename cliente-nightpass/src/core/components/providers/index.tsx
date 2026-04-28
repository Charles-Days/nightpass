'use client';

import * as React from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from './theme-provider';
import { QueryProvider } from './query-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        {children}
        <Toaster position="top-right" theme="dark" richColors closeButton />
      </QueryProvider>
    </ThemeProvider>
  );
}
