import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:7101';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes deshabilitado mientras existan rutas placeholder en el sidebar.
  // Reactivar cuando todos los modulos (venues, events, passes, ...) existan.
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${API_URL}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
