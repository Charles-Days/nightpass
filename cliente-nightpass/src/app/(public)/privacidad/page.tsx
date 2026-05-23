import Link from 'next/link';
import { Clock, MapPin, ShieldCheck, Trash2, UserCheck } from 'lucide-react';

export const metadata = {
  title: 'Política de Privacidad — Ubicación · NightPass',
  description:
    'Cómo NightPass recopila, usa y borra tu ubicación. Sin venta de datos, sin compartir con terceros, retención máxima de 24 horas.',
};

export default function PrivacidadPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        Privacidad
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-5xl">
        Política de Privacidad
        <br />
        <span className="font-serif italic text-purple-200">Ubicación</span>
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Esta política describe cómo NightPass trata los datos de geolocalización que decides
        compartir con la app. Es directa, sin letra pequeña.
      </p>

      <div className="mt-10 space-y-5">
        <Section
          icon={<MapPin className="size-4" />}
          title="Qué recopilamos"
        >
          <p>
            Latitud, longitud y precisión (en metros) en dos momentos concretos:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Cuando abres la app (si tienes el permiso activado).</li>
            <li>Cuando abres un pase para mostrarlo en la puerta.</li>
          </ul>
          <p className="mt-2">
            No accedemos a tu ubicación en segundo plano. Solo cuando la app está abierta.
          </p>
        </Section>

        <Section
          icon={<UserCheck className="size-4" />}
          title="Para qué"
        >
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Mostrarte qué bares están más llenos en este momento, a partir de datos
              agregados y anónimos.
            </li>
            <li>
              Antifraude al escanear el QR en puerta: confirmamos que el pase se está usando
              cerca del local correcto.
            </li>
          </ul>
        </Section>

        <Section
          icon={<Clock className="size-4" />}
          title="Retención"
        >
          <p>
            Conservamos cada ping <strong className="text-white">24 horas como máximo</strong>.
            Un proceso automático borra los registros vencidos cada hora.
          </p>
        </Section>

        <Section
          icon={<Trash2 className="size-4" />}
          title="Tu control"
        >
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Puedes revocar el permiso en cualquier momento desde los Ajustes de tu sistema
              o navegador.
            </li>
            <li>
              Desde{' '}
              <Link
                href="/app/perfil#ubicacion"
                className="text-primary underline-offset-2 hover:underline"
              >
                tu perfil
              </Link>{' '}
              puedes borrar todo tu historial con un botón.
            </li>
          </ul>
        </Section>

        <Section
          icon={<ShieldCheck className="size-4" />}
          title="No compartimos"
        >
          <p>
            No compartimos tu ubicación con terceros. No la vendemos. No la usamos para
            publicidad. Solo NightPass procesa estos datos, y únicamente para las dos
            finalidades de arriba.
          </p>
        </Section>
      </div>

      <div className="mt-12 rounded-[22px] border border-white/10 bg-white/[0.025] p-5 text-xs leading-relaxed text-muted-foreground sm:p-6">
        ¿Tienes dudas sobre cómo tratamos tus datos? Escríbenos a{' '}
        <a
          href="mailto:privacidad@nightpass.mx"
          className="text-primary underline-offset-2 hover:underline"
        >
          privacidad@nightpass.mx
        </a>
        .
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[0.025] p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-white sm:text-xl">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
          {icon}
        </span>
        {title}
      </h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-white/80">{children}</div>
    </section>
  );
}
