'use client';

import 'leaflet/dist/leaflet.css';
import * as React from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

export interface LeafletMapProps {
  /** 'pick' = el usuario hace tap para colocar el pin; 'view' = solo lectura. */
  mode?: 'pick' | 'view';
  value: { lat: number; lng: number } | null;
  onChange?: (coords: { lat: number; lng: number }) => void;
  /** Alto del mapa en px. */
  height?: number;
  className?: string;
  zoom?: number;
}

// Pin morado NightPass como divIcon — evita el bug del marcador default de
// Leaflet (assets rotos al bundlear) sin depender de imágenes.
const pinIcon = L.divIcon({
  className: 'np-leaflet-pin',
  html: `<div style="
    width:26px;height:26px;border-radius:50% 50% 50% 0;
    background:linear-gradient(135deg,#9333ea,#a855f7);
    transform:rotate(-45deg);
    border:2px solid #fff;
    box-shadow:0 4px 12px -2px rgba(168,85,247,0.7);
  "></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332]; // CDMX

function ClickCapture({
  onChange,
}: {
  onChange?: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// El mapa se monta dentro de un modal que anima: al inicio mide 0px y no pinta
// tiles (quedan grises). Forzamos `invalidateSize()` tras la animación y ante
// cualquier resize del contenedor.
function ResizeFix() {
  const map = useMap();
  React.useEffect(() => {
    const fix = () => map.invalidateSize();
    const timers = [80, 250, 500, 900].map((ms) => setTimeout(fix, ms));
    const ro = new ResizeObserver(fix);
    ro.observe(map.getContainer());
    return () => {
      timers.forEach(clearTimeout);
      ro.disconnect();
    };
  }, [map]);
  return null;
}

// El `center` del MapContainer no es reactivo: cuando las coords cambian (p.ej.
// al resolver un link de Maps), hay que mover la vista manualmente.
function Recenter({ value }: { value: { lat: number; lng: number } | null }) {
  const map = useMap();
  React.useEffect(() => {
    // Acerca al ubicar (zoom ≥17) para que el RP vea exacto dónde cayó y pueda
    // arrastrar el pin al punto fino. No aleja si ya estaba más cerca.
    if (value) map.setView([value.lat, value.lng], Math.max(map.getZoom(), 17));
  }, [map, value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function LeafletMapInner({
  mode = 'view',
  value,
  onChange,
  height = 220,
  className,
  zoom = 15,
}: LeafletMapProps) {
  const center: [number, number] = value
    ? [value.lat, value.lng]
    : DEFAULT_CENTER;

  return (
    <div
      className={className}
      style={{ height, borderRadius: 16, overflow: 'hidden' }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ResizeFix />
        <Recenter value={value} />
        {mode === 'pick' ? <ClickCapture onChange={onChange} /> : null}
        {value ? (
          <Marker
            position={[value.lat, value.lng]}
            icon={pinIcon}
            draggable={mode === 'pick'}
            eventHandlers={
              mode === 'pick'
                ? {
                    dragend: (e) => {
                      const ll = e.target.getLatLng();
                      onChange?.({ lat: ll.lat, lng: ll.lng });
                    },
                  }
                : undefined
            }
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
