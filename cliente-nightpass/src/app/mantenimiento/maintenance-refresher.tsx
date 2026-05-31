'use client';

import * as React from 'react';

/**
 * Reintenta cargar la app sola cada `intervalMs`. Cuando el backend vuelve (o
 * el admin apaga el flag), el middleware deja de hacer rewrite a /mantenimiento
 * y el reload muestra la app normal.
 */
export function MaintenanceRefresher({
  intervalMs = 20_000,
}: {
  intervalMs?: number;
}) {
  React.useEffect(() => {
    const id = setInterval(() => {
      window.location.reload();
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return null;
}
