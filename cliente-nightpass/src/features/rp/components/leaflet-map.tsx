'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { LeafletMapProps } from './leaflet-map-inner';

// Leaflet toca `window` al importarse → cargar solo en cliente (ssr:false).
const Inner = dynamic(() => import('./leaflet-map-inner'), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]"
      style={{ height: 220 }}
    >
      <Loader2 className="size-5 animate-spin text-primary" />
    </div>
  ),
});

/** Mapa OpenStreetMap (Leaflet). `mode='pick'` deja colocar el pin con tap. */
export function LeafletMap(props: LeafletMapProps) {
  return <Inner {...props} />;
}

export type { LeafletMapProps };
