import type { ReactElement } from 'react';

/** Tamaño y tipo estándar de las imágenes OpenGraph (1200×630). */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

const BG = '#0A0A0F';
const PURPLE = '#A855F7';
const PURPLE_DEEP = '#9333EA';

/**
 * Marco branded NightPass para `ImageResponse` (next/og). Solo usa flexbox +
 * estilos inline (requisito de Satori). Devuelve el árbol JSX a pasar a
 * `new ImageResponse(<OgFrame .../>, { ...OG_SIZE })`.
 */
export function OgFrame({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px',
        backgroundColor: BG,
        backgroundImage: `radial-gradient(900px circle at 85% 15%, ${PURPLE_DEEP}55, transparent 60%), radial-gradient(700px circle at 10% 95%, ${PURPLE}33, transparent 55%)`,
        color: '#FFFFFF',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Marca */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: `linear-gradient(135deg, ${PURPLE_DEEP}, ${PURPLE})`,
            display: 'flex',
          }}
        />
        <span style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em' }}>
          NightPass
        </span>
      </div>

      {/* Contenido */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {eyebrow ? (
          <span
            style={{
              fontSize: '24px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: PURPLE,
            }}
          >
            {eyebrow}
          </span>
        ) : null}
        <span
          style={{
            fontSize: title.length > 48 ? '64px' : '80px',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            maxWidth: '1040px',
          }}
        >
          {title}
        </span>
        {subtitle ? (
          <span style={{ fontSize: '34px', color: 'rgba(255,255,255,0.72)' }}>
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}
