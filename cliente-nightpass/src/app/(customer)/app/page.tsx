import Link from 'next/link';
import { ArrowRight, GlassWater, MapPin, Music, QrCode, Sparkles, Star } from 'lucide-react';
import { absoluteUrl } from '@/core/config/env';
import { AppOpenPinger } from '@/features/geolocation';
import { paths } from '@/core/config/paths';

const title = 'Antros — NightPass';
const description =
  'Descubre bares, antros, rooftops y lounges cerca de ti. Compra tu cover digital y entra sin filas con tu pase QR.';

export const metadata = {
  title,
  description,
  alternates: { canonical: '/app' },
  openGraph: { title, description, url: absoluteUrl('/app'), type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
};

const features = [
  {
    icon: MapPin,
    title: 'Antros cerca de ti',
    text: 'Bares, rooftops y lounges geolocalizados, abiertos esta noche.',
  },
  {
    icon: Music,
    title: 'Filtra por tu vibra',
    text: 'Por género musical, ambiente, cócteles, dress code y rango de precio.',
  },
  {
    icon: QrCode,
    title: 'Cover digital con QR',
    text: 'Paga tu entrada desde la app y pasa sin filas mostrando tu pase.',
  },
  {
    icon: Star,
    title: 'Lo que está pasando',
    text: 'Fotos en vivo, line-ups y los antros destacados de la noche.',
  },
];

export default function AntrosPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-5 pt-8 sm:px-8 sm:pb-7 sm:pt-9">
      <AppOpenPinger />

      <p
        className="np-rise text-[11px] font-semibold uppercase tracking-[0.22em] text-primary"
        style={{ animationDelay: '0ms' }}
      >
        Antros
      </p>
      <h1
        className="np-rise mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl"
        style={{ animationDelay: '40ms' }}
      >
        ¿A qué <span className="font-serif italic font-normal text-purple-200">antro</span> vas
        esta noche?
      </h1>

      {/* Hero "Próximamente" */}
      <div
        className="np-rise relative mt-6 overflow-hidden rounded-[24px] border border-primary/25 bg-white/[0.05] p-6 text-center shadow-[0_0_44px_-18px_rgba(168,85,247,0.55)] sm:p-9"
        style={{ animationDelay: '90ms' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 0%, rgba(168,85,247,0.18) 0%, rgba(168,85,247,0) 55%)',
          }}
        />
        <span className="mx-auto grid size-16 place-items-center rounded-2xl border border-primary/30 bg-primary/15">
          <GlassWater className="size-7 text-primary" />
        </span>
        <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          <Sparkles className="size-3" /> Próximamente
        </span>
        <h2 className="mt-4 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
          Estamos preparando los mejores antros
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/60">
          Muy pronto vas a descubrir bares, rooftops y lounges cerca de ti, comparar covers y
          entrar sin filas con tu pase digital. Estamos sumando locales en tu ciudad.
        </p>
      </div>

      {/* Qué vas a poder hacer */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {features.map(({ icon: Icon, title: t, text }, i) => (
          <div
            key={t}
            className="np-rise flex items-start gap-3 rounded-[20px] border border-white/14 bg-white/[0.05] p-4"
            style={{ animationDelay: `${130 + i * 50}ms` }}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/14 bg-white/[0.07]">
              <Icon className="size-5 text-primary" />
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-white">{t}</p>
              <p className="text-xs leading-relaxed text-white/55">{text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA a Eventos (ya funcional) */}
      <Link
        href={paths.eventos}
        className="np-rise mt-5 flex items-center justify-between gap-3 rounded-[20px] border border-white/14 bg-white/[0.05] p-4 transition hover:border-primary/40 hover:bg-white/[0.08] active:scale-[0.99]"
        style={{ animationDelay: '340ms' }}
      >
        <div>
          <p className="text-sm font-semibold text-white">Mientras tanto, explora Eventos</p>
          <p className="text-xs text-white/55">Fiestas y line-ups con pase QR, ya disponibles.</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(168,85,247,0.6)]">
          Ver <ArrowRight className="size-4" />
        </span>
      </Link>
    </div>
  );
}
