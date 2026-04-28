import Link from 'next/link';
import { Button } from '@/core/components/ui/button';
import { paths } from '@/core/config/paths';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Pagina no encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        La ruta que buscas no existe o fue movida.
      </p>
      <Button asChild>
        <Link href={paths.dashboard}>Volver al panel</Link>
      </Button>
    </div>
  );
}
