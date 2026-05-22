import Link from 'next/link';
import { Apple, ArrowRight, Check, Globe, Plus, Star } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { paths } from '@/core/config/paths';
import { Counter } from '@/core/components/counter';
import { Reveal } from '@/core/components/reveal';
import { DemoDialog } from './_components/demo-dialog';
import { PhoneMockup } from './_components/phone-mockup';

export const metadata = {
  title: { absolute: 'NightPass' },
  description:
    'NightPass es la app para descubrir bares, comprar tu cover digital y compartir la noche con tus amigos. Sin colas, sin efectivo, sin ticket que perder.',
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <VenuesStrip />
      <HowItWorks />
      <ForVenues />
    </>
  );
}

// ────────────────────────────────────────────────
// Atmosphere — bokeh estatico (sin animacion)
// ────────────────────────────────────────────────

function HeroBokeh() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute rounded-full"
        style={{
          top: '5%',
          left: '10%',
          width: 380,
          height: 380,
          filter: 'blur(110px)',
          opacity: 0.55,
          background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: '40%',
          right: '5%',
          width: 460,
          height: 460,
          filter: 'blur(130px)',
          opacity: 0.4,
          background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          bottom: '-10%',
          left: '40%',
          width: 420,
          height: 420,
          filter: 'blur(140px)',
          opacity: 0.35,
          background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────
// Atoms
// ────────────────────────────────────────────────

function Eyebrow({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[11px] font-semibold uppercase tracking-[0.22em] text-primary ${className}`}
    >
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative px-6 pt-10 pb-24 sm:px-14 sm:pt-14 sm:pb-25">
      <HeroBokeh />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-[60px]">
        <div>
          <div className="np-rise">
            <Eyebrow>Nueva forma de salir · Madrid · Barcelona · Valencia</Eyebrow>
          </div>
          <h1
            className="np-rise mt-5 font-display text-5xl font-bold leading-[0.96] tracking-[-0.035em] sm:text-6xl lg:text-[84px]"
            style={{ animationDelay: '120ms' }}
          >
            Vive la noche
            <br />
            <span className="font-serif text-purple-200 italic">sin filas</span>,
            <br />
            sin fricción.
          </h1>
          <p
            className="np-rise mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ animationDelay: '280ms' }}
          >
            Descubre los mejores bares y discos cerca de ti, compra tu cover digital y entra con un
            QR. Sin colas, sin efectivo, sin ticket que perder.
          </p>
          <div
            className="np-rise mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            style={{ animationDelay: '420ms' }}
          >
            <Button
              type="button"
              size="lg"
              disabled
              aria-disabled
              title="Pronto disponible"
              className="group relative h-12 cursor-default rounded-full bg-gradient-to-r from-[#a855f7]/60 to-[#9333ea]/60 px-6 text-base font-semibold text-white shadow-[0_10px_30px_-8px_rgba(168,85,247,0.35)] disabled:cursor-default disabled:opacity-100"
            >
              <Apple className="size-5" />
              Descargar app
              <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Pronto
              </span>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="group h-12 rounded-full border-purple-300/30 bg-purple-500/[0.08] px-6 text-base font-semibold text-white backdrop-blur-md transition hover:border-purple-300/60 hover:bg-purple-500/[0.18]"
            >
              <Link href={paths.appHome}>
                <Globe className="size-4 text-purple-200" />
                Versión web
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <DemoDialog />
          </div>
          <div className="np-rise" style={{ animationDelay: '560ms' }}>
            <SocialProof />
          </div>
        </div>

        <div
          className="np-zoom-in relative flex justify-center lg:justify-end"
          style={{ animationDelay: '200ms' }}
        >
          <div
            className="pointer-events-none absolute hidden lg:block"
            style={{ right: -30, top: 40 }}
          >
            <PhoneMockup tilt={8} scale={0.85} />
          </div>
          <div className="relative z-[2]">
            <PhoneMockup tilt={-6} />
          </div>
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  const hues = [280, 320, 260, 300];
  return (
    <div className="mt-9 flex flex-wrap items-center gap-5">
      <div className="flex">
        {hues.map((h, i) => (
          <div
            key={h}
            className={`size-8 rounded-full border-2 border-background ${i ? '-ml-2.5' : ''}`}
            style={{
              background: `linear-gradient(135deg, hsl(${h} 60% 50%), hsl(${h + 30} 55% 30%))`,
            }}
          />
        ))}
      </div>
      <div>
        <p className="text-sm font-semibold">+24,000 personas ya entran sin fila</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="size-3 fill-current" />
          4.8 · App Store · 1.2k reseñas
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Venues strip
// ────────────────────────────────────────────────

function VenuesStrip() {
  const venues = ['Sala Apolo', 'Razzmatazz', 'Moog', 'Macarena', 'Goya Social', 'Mondo'];
  return (
    <section className="mx-auto w-full max-w-7xl px-6 sm:px-14">
      <Reveal>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4 rounded-3xl border border-white/10 bg-white/[0.025] px-9 py-7 backdrop-blur-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] whitespace-nowrap text-muted-foreground">
            Ya disponible en
          </span>
          <div className="flex flex-1 flex-wrap items-center justify-around gap-x-10 gap-y-3">
            {venues.map((v) => (
              <span
                key={v}
                className="font-display text-base font-semibold tracking-[-0.01em] text-white/55"
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ────────────────────────────────────────────────
// How it works
// ────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 pt-24 pb-20 sm:px-14 sm:pt-[120px]">
      <Reveal>
        <header className="mb-12 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <Eyebrow>Para clientes</Eyebrow>
            <h2 className="mt-3 font-display text-4xl font-bold leading-none tracking-[-0.03em] sm:text-5xl lg:text-[56px]">
              Tres pasos.
              <br />
              Cero filas.
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Desde que abres la app hasta que pasas la puerta — menos de 2 minutos.
          </p>
        </header>
      </Reveal>
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal delay={0}>
          <StepCard
            n="01"
            title="Descubre en vivo"
            desc="Bares cerca con aforo en tiempo real, reseñas reales, géneros musicales y precios actualizados al minuto."
            demo={<CapacityDemo />}
          />
        </Reveal>
        <Reveal delay={140}>
          <StepCard
            n="02"
            title="Compra el cover"
            desc="Tu cover digital con QR seguro, encriptado y único. Sin efectivo, sin tickets que perder, sin sorpresas en la puerta."
            demo={<QRDemo />}
          />
        </Reveal>
        <Reveal delay={280}>
          <StepCard
            n="03"
            title="Entra con un toque"
            desc="Llegas, escanean tu QR, entras. Comparte el plan con tu grupo y dividan el cover desde la app con un toque."
            demo={<NotificationsDemo />}
          />
        </Reveal>
      </div>
    </section>
  );
}

function StepCard({
  n,
  title,
  desc,
  demo,
}: {
  n: string;
  title: string;
  desc: string;
  demo: React.ReactNode;
}) {
  return (
    <div className="np-card-hover flex min-h-[360px] flex-col gap-5 rounded-[22px] border border-white/10 bg-white/[0.025] p-7 hover:border-white/20 hover:bg-white/[0.04]">
      <div className="flex items-center gap-4">
        <div className="font-serif text-[38px] leading-none font-normal text-primary italic">
          {n}
        </div>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <div>
        <h3 className="font-display text-[22px] font-bold tracking-[-0.02em]">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </div>
      <div className="mt-auto">{demo}</div>
    </div>
  );
}

function CapacityDemo() {
  const items = [
    { n: 'Sala Apolo', p: 92 },
    { n: 'Razzmatazz', p: 78 },
    { n: 'Moog', p: 45 },
  ];
  return (
    <div className="space-y-3">
      {items.map((x) => {
        const color = x.p > 85 ? '#f0abfc' : x.p > 60 ? '#fbbf24' : '#86efac';
        return (
          <div key={x.n}>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="font-medium">{x.n}</span>
              <span className="text-muted-foreground">{x.p}% aforo</span>
            </div>
            <div className="mb-1.5 flex justify-between">
              <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                Capacity
              </span>
              <span className="text-xs font-semibold" style={{ color }}>
                {x.p}%
              </span>
            </div>
            <div className="h-[5px] overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${x.p}%`,
                  background: color,
                  boxShadow: `0 0 12px ${color}`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QRDemo() {
  const cells = Array.from({ length: 64 }, (_, i) => (i * 37 + 3) % 5 < 3);
  return (
    <div
      className="relative grid h-[156px] place-items-center overflow-hidden rounded-2xl border border-white/10"
      style={{
        background: 'linear-gradient(135deg, oklch(0.18 0.05 296.5), oklch(0.078 0.005 280))',
      }}
    >
      <div className="grid size-[110px] grid-cols-8 gap-[1.5px] rounded-xl bg-white p-2">
        {cells.map((on, i) => (
          <div key={i} className={`rounded-[1px] ${on ? 'bg-[#0a0a0f]' : 'bg-white'}`} />
        ))}
      </div>
      <div className="absolute bottom-2.5 left-3 text-[10px] text-muted-foreground">
        NP-2A4F · €12 · 23:47
      </div>
    </div>
  );
}

function NotificationsDemo() {
  const items = [
    { who: 'Lucía pagó tu parte', amt: '€6.00', ok: true },
    { who: 'Tu QR fue escaneado', amt: '23:51', ok: true },
    { who: 'Marcos se unió al plan', amt: '+1', ok: false },
  ];
  return (
    <div className="space-y-2">
      {items.map((m) => (
        <div
          key={m.who}
          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`grid size-[22px] place-items-center rounded-full ${
                m.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/20 text-purple-200'
              }`}
            >
              {m.ok ? <Check className="size-3" /> : <Plus className="size-3" />}
            </div>
            <span className="text-xs">{m.who}</span>
          </div>
          <span className="text-[11px] text-muted-foreground">{m.amt}</span>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────
// For venues
// ────────────────────────────────────────────────

function ForVenues() {
  const metrics = [
    { value: <Counter to={38} prefix="+" suffix="%" />, l: 'ingresos antes del evento' },
    { value: <Counter to={72} prefix="−" suffix="%" />, l: 'tiempo medio en cola' },
    { value: <Counter to={4.9} decimals={1} suffix="★" />, l: 'satisfacción operativa' },
  ];
  return (
    <section className="mx-auto w-full max-w-7xl px-6 pt-10 pb-25 sm:px-14">
      <Reveal>
        <div
          className="relative overflow-hidden rounded-[28px] border border-purple-400/25 p-8 sm:p-12"
          style={{
            background:
              'linear-gradient(135deg, oklch(0.18 0.05 296.5) 0%, oklch(0.078 0.005 280) 70%)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-[400px] w-[400px] rounded-full opacity-50"
            style={{
              background: 'radial-gradient(circle, oklch(0.62 0.245 296.5), transparent 70%)',
              filter: 'blur(120px)',
            }}
          />
          <div className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <Eyebrow>Para locales</Eyebrow>
              <h2 className="mt-3 font-display text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">
                Llena tu local antes
                <br />
                de abrir las puertas.
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
                Vende cover por adelantado, controla aforo en vivo y aparece frente a miles de
                personas que están buscando dónde salir esta noche.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-8 rounded-full shadow-[0_10px_30px_-8px_rgba(168,85,247,0.65)]"
              >
                <Link href={paths.solicitarLocal}>
                  Solicita tu registro
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">
                Sin permanencia · 0% comisión los primeros 3 meses
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {metrics.map((m, i) => (
                <div
                  key={i}
                  className="np-card-hover flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <div className="font-display text-[38px] leading-none font-bold tracking-[-0.02em] tabular-nums">
                    {m.value}
                  </div>
                  <div className="max-w-[180px] text-right text-sm leading-snug text-muted-foreground">
                    {m.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
