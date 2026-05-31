/**
 * IP del cliente. Fastify ya resuelve `req.ip` respetando `trustProxy`
 * (lee X-Forwarded-For solo si confiamos en el proxy — ver main.ts).
 */
export function clientIp(req: { ip?: string; socket?: { remoteAddress?: string } }): string {
  return req?.ip || req?.socket?.remoteAddress || 'unknown';
}

// Rangos privados / loopback: IPv4 (10/8, 127/8, 192.168/16, 172.16-31/12) e
// IPv6 ULA (fc00::/7 → fc/fd). También IPv4 mapeado a IPv6 (::ffff:10.x) y ::1.
const PRIVATE_IP = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fc|fd)/i;

/**
 * ¿La IP es interna/infra (proxy de Coolify, contenedores Next que hacen SSR y
 * proxean /api)? Esas IPs concentran TODO el tráfico server-side; jamás deben
 * contar para el rate-limit ni quedar baneadas — si no, una sola IP se autobanea
 * y tumba el sitio entero. Sin IP fiable ('unknown') → tratar como interno.
 */
export function isInternalIp(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;
  const clean = ip.replace(/^::ffff:/i, '');
  return clean === '::1' || PRIVATE_IP.test(clean);
}
