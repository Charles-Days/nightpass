import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const API_URL = process.env.API_URL ?? 'http://localhost:7101';

const isProd = process.env.NODE_ENV === 'production';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: !isProd,
});

// CSP host wildcards only allow one level (RFC 7230). `pub-*.r2.dev` is
// invalid: browsers drop the entire directive value. `*.r2.dev` already
// covers `pub-xxx.r2.dev`. upgrade-insecure-requests forces http→https on the
// whole page, breaking localhost dev (no TLS) — only emit in prod.
const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-inline' required for Next.js inline runtime scripts; mitigated by
  // frame-ancestors 'none' + X-Frame-Options DENY. Move to nonces in a future pass.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://js.stripe.com https://accounts.google.com/gsi/client https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.r2.dev https://*.stripe.com https://images.unsplash.com https://*.googleusercontent.com http://127.0.0.1:7101 http://localhost:7101",
  "media-src 'self' blob: https://*.r2.dev",
  "connect-src 'self' blob: https://api.nightpass.mx https://api.stripe.com https://js.stripe.com https://m.stripe.com https://m.stripe.network https://r.stripe.com https://q.stripe.com https://merchant-ui-api.stripe.com https://*.r2.dev https://*.r2.cloudflarestorage.com https://accounts.google.com https://unpkg.com http://127.0.0.1:7101 http://localhost:7101",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://accounts.google.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
];
if (isProd) cspDirectives.push('upgrade-insecure-requests');
const csp = cspDirectives.join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'http', hostname: '127.0.0.1', port: '7101' },
      { protocol: 'http', hostname: 'localhost', port: '7101' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [320, 360, 414, 480, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 24, 32, 40, 48, 64, 96, 128, 192, 256, 384],
  },
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${API_URL}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(self), microphone=(self), geolocation=(self)',
      },
      { key: 'Content-Security-Policy', value: csp },
    ];
    if (isProd) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
