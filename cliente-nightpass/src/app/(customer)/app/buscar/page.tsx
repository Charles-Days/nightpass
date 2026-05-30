import { redirect } from 'next/navigation';
import { paths } from '@/core/config/paths';

// Legacy: la búsqueda genérica se dividió en Antros (/app) y Eventos (/app/eventos).
// Mantener la ruta viva para no romper links/bookmarks antiguos.
export default function BuscarRedirect() {
  redirect(paths.appHome);
}
