/**
 * Bypass de compra directa para desarrollo: emite órdenes/pases sin pasar por
 * Stripe. SOLO debe estar activo fuera de producción. La env var por sí sola no
 * basta — exigimos además que NODE_ENV !== 'production' para que una variable
 * filtrada a prod no se convierta en una fábrica de pases gratis.
 *
 * En boot, `env.schema.ts` además hace fallar el arranque si en producción
 * alguien deja STRIPE_DEV_BYPASS truthy (defensa en profundidad).
 */
export function isDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.STRIPE_DEV_BYPASS === 'true'
  );
}
