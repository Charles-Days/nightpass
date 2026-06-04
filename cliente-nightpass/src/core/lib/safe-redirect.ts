/**
 * Devuelve una ruta interna segura para redirigir tras login, o `fallback` si
 * la entrada no es segura.
 *
 * `from.startsWith('/')` NO basta: `//evil.com` y `/\evil.com` empiezan con `/`
 * pero el navegador los interpreta como host externo (URL protocol-relative) →
 * open redirect. Solo aceptamos rutas que empiezan con un único `/` seguido de
 * un carácter que no sea `/` ni `\`.
 */
export function safeRedirectPath(
  from: string | null | undefined,
  fallback: string,
): string {
  if (!from) return fallback;
  // Debe ser una ruta absoluta del propio sitio: un solo '/' inicial seguido de
  // un carácter que no sea '/' ni '\'. Rechaza '//evil.com' y '/\evil.com'.
  if (!/^\/[^/\\]/.test(from)) return fallback;
  return from;
}
