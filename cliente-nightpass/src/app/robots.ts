import type { MetadataRoute } from 'next';
import { absoluteUrl, siteUrl } from '@/core/config/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/dashboard',
        '/mi-local',
        '/scanner',
        '/login',
        '/cambiar-password',
        '/forgot-password',
        '/reset-password',
        '/app/perfil',
        '/app/pases',
        '/app/checkout',
        '/app/recompensas',
        '/app/mi-organizador',
        '/app/iniciar-sesion',
        '/app/registro',
        '/app/recuperar-password',
        '/app/restablecer-password',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteUrl(),
  };
}
