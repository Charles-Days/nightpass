/**
 * IP del cliente. Fastify ya resuelve `req.ip` respetando `trustProxy`
 * (lee X-Forwarded-For solo si confiamos en el proxy — ver main.ts).
 */
export function clientIp(req: { ip?: string; socket?: { remoteAddress?: string } }): string {
  return req?.ip || req?.socket?.remoteAddress || 'unknown';
}
