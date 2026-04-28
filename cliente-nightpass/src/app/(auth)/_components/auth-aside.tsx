import Link from 'next/link';
import { ArrowLeft, MapPin, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import { paths } from '@/core/config/paths';
import { clientEnv } from '@/core/config/env';

export function AuthAside() {
  return (
    <aside
      className="relative hidden flex-col justify-between overflow-hidden border-r border-white/5 px-12 py-10 lg:flex"
      style={{
        background:
          'linear-gradient(135deg, oklch(0.18 0.05 296.5) 0%, oklch(0.078 0.005 280) 70%)',
      }}
    >
      <AsideBokeh />

      <div className="np-rise relative z-10 flex items-center justify-between">
        <Link href={paths.home} className="font-display text-xl font-bold tracking-tight">
          {clientEnv.NEXT_PUBLIC_APP_NAME.replace(' Admin', '')}
        </Link>
        <Link
          href={paths.home}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Volver al sitio
        </Link>
      </div>

      <div className="relative z-10 max-w-lg">
        <p
          className="np-rise text-[11px] font-semibold uppercase tracking-[0.22em] text-primary"
          style={{ animationDelay: '120ms' }}
        >
          Panel de operaciones
        </p>
        <h2
          className="np-rise mt-5 font-display text-5xl font-bold leading-[1.05] tracking-[-0.025em]"
          style={{ animationDelay: '240ms' }}
        >
          La noche,{' '}
          <span className="font-serif text-purple-200 italic">sin filas</span> ni fricción.
        </h2>
        <p
          className="np-rise mt-5 max-w-md text-base leading-relaxed text-muted-foreground"
          style={{ animationDelay: '380ms' }}
        >
          Gestiona tu local, aprueba solicitudes y revisa tus pases vendidos en tiempo real.
        </p>

        <ul className="mt-10 space-y-3 text-sm">
          <FeatureRow icon={Sparkles} title="Aprueba locales en un click" delay={520} />
          <FeatureRow icon={MapPin} title="Aforo y ventas en vivo" delay={620} />
          <FeatureRow icon={ShieldCheck} title="QR cifrado punto a punto" delay={720} />
        </ul>
      </div>

      <p
        className="np-rise relative z-10 text-xs text-muted-foreground"
        style={{ animationDelay: '860ms' }}
      >
        © {new Date().getFullYear()} NightPass · Todos los derechos reservados.
      </p>
    </aside>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  delay = 0,
}: {
  icon: LucideIcon;
  title: string;
  delay?: number;
}) {
  return (
    <li className="np-rise flex items-center gap-3" style={{ animationDelay: `${delay}ms` }}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="size-4" />
      </span>
      <span>{title}</span>
    </li>
  );
}

function AsideBokeh() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute rounded-full"
        style={{
          top: '-10%',
          left: '-15%',
          width: 520,
          height: 520,
          filter: 'blur(140px)',
          opacity: 0.55,
          background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          bottom: '-15%',
          right: '-20%',
          width: 460,
          height: 460,
          filter: 'blur(150px)',
          opacity: 0.4,
          background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: '40%',
          left: '50%',
          width: 380,
          height: 380,
          filter: 'blur(160px)',
          opacity: 0.3,
          background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
