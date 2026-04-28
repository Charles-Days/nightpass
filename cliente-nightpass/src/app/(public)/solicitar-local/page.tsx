import { Inbox, Mail, Sparkles, type LucideIcon } from 'lucide-react';
import { Reveal } from '@/core/components/reveal';
import { ApplicationForm } from '@/features/venue-applications';

export const metadata = { title: 'Solicitar registro de local' };

export default function SolicitarLocalPage() {
  return (
    <section className="relative px-6 pt-12 pb-24 sm:px-14">
      <PageBokeh />
      <div className="relative mx-auto max-w-6xl">
        <header className="max-w-2xl">
          <p className="np-rise text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Para locales
          </p>
          <h1
            className="np-rise mt-4 font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-6xl"
            style={{ animationDelay: '120ms' }}
          >
            Pon tu local{' '}
            <span className="font-serif text-purple-200 italic">en NightPass</span>.
          </h1>
          <p
            className="np-rise mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ animationDelay: '280ms' }}
          >
            Cuéntanos sobre el lugar que quieres administrar. Nuestro equipo revisa tu solicitud y
            te avisa por email — sin papeleo, sin cuentas que crear.
          </p>
        </header>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <Reveal>
            <Steps />
          </Reveal>
          <Reveal delay={140}>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-7 backdrop-blur-sm sm:p-9">
              <ApplicationForm />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const items: { icon: LucideIcon; title: string; desc: string }[] = [
    {
      icon: Inbox,
      title: 'Llenas el formulario',
      desc: 'Tus datos y los del local. No pedimos contraseña — la generamos cuando te aprobamos.',
    },
    {
      icon: Sparkles,
      title: 'Revisamos en 24-48 h',
      desc: 'Verificamos tu local y nos aseguramos que tenga sentido para nuestros usuarios.',
    },
    {
      icon: Mail,
      title: 'Te llega un email',
      desc: 'Si te aprobamos, te mandamos tus credenciales temporales y un link al panel.',
    },
  ];

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
        Cómo funciona
      </p>
      <ol className="mt-6 space-y-6">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary">
                  <Icon className="size-4" />
                </span>
                {i < items.length - 1 ? (
                  <span className="mt-2 h-12 w-px bg-gradient-to-b from-primary/30 to-transparent" />
                ) : null}
              </div>
              <div className="pb-2">
                <p className="font-display text-base font-semibold tracking-[-0.01em]">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-10 rounded-2xl border border-purple-400/20 bg-purple-500/5 p-5">
        <p className="font-display text-sm font-semibold">¿Tienes preguntas antes de aplicar?</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Escríbenos a{' '}
          <a
            href="mailto:hola@nightpass.app"
            className="font-medium text-primary hover:underline"
          >
            hola@nightpass.app
          </a>{' '}
          y te respondemos el mismo día.
        </p>
      </div>
    </div>
  );
}

function PageBokeh() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute rounded-full"
        style={{
          top: '-10%',
          left: '5%',
          width: 460,
          height: 460,
          filter: 'blur(140px)',
          opacity: 0.4,
          background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: '30%',
          right: '-5%',
          width: 420,
          height: 420,
          filter: 'blur(150px)',
          opacity: 0.3,
          background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
