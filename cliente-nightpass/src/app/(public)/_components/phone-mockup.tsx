interface PhoneMockupProps {
  tilt?: number;
  scale?: number;
  className?: string;
}

const VENUES = [
  { n: 'Razzmatazz', t: 'House · 2.4 km', p: 80 },
  { n: 'Macarena Club', t: 'Latino · 0.8 km', p: 35 },
  { n: 'Moog', t: 'Electro · 1.1 km', p: 92 },
];

function venueAccent(p: number) {
  if (p > 85) return 'text-fuchsia-400';
  if (p > 60) return 'text-amber-400';
  return 'text-emerald-300';
}

export function PhoneMockup({ tilt = -6, scale = 1, className = '' }: PhoneMockupProps) {
  return (
    <div
      className={className}
      style={{
        width: 'min(280px, 80vw)',
        aspectRatio: '280/580',
        transform: `rotate(${tilt}deg) scale(${scale})`,
        transformOrigin: 'center',
        padding: 8,
        borderRadius: 44,
        background: 'linear-gradient(160deg, #2a2a35, #0a0a0f)',
        boxShadow:
          '0 60px 120px -30px rgba(168,85,247,0.45), 0 30px 60px -20px rgba(0,0,0,0.8), inset 0 0 0 1.5px rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="relative size-full overflow-hidden rounded-[36px]"
        style={{
          background: 'linear-gradient(180deg, #1a0b2e 0%, #0a0a0f 100%)',
        }}
      >
        {/* notch */}
        <div className="absolute left-1/2 top-2 z-10 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />

        {/* status bar */}
        <div className="absolute left-6 right-6 top-3.5 flex justify-between text-xs font-semibold text-white">
          <span>23:47</span>
          <span className="inline-block h-2 w-3.5 rounded-[2px] border border-white" />
        </div>

        {/* App content */}
        <div className="px-4 pb-4 pt-[54px]">
          <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/55">
            ESTA NOCHE · CUERNAVACA
          </div>
          <div className="mt-1 font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-white">
            Cerca de ti
          </div>

          {/* Featured card */}
          <div
            className="relative mt-3.5 h-40 overflow-hidden rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, hsl(290 50% 25%), hsl(260 55% 15%))',
            }}
          >
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 12px)',
              }}
            />
            <div className="absolute left-2.5 top-2.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold tracking-[0.04em] uppercase text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_currentColor]" />
                LIVE · 142
              </span>
            </div>
            <div className="absolute bottom-2.5 left-3 right-3 text-white">
              <div className="font-display text-base font-bold">Sala Apolo</div>
              <div className="text-[11px] opacity-80">Techno · 1.2 km · Cover desde €12</div>
            </div>
          </div>

          {/* Lista */}
          <div className="mt-2">
            {VENUES.map((b, i) => (
              <div
                key={b.n}
                className={`flex items-center gap-2.5 py-2.5 ${
                  i < VENUES.length - 1 ? 'border-b border-white/10' : ''
                }`}
              >
                <div
                  className="size-9 shrink-0 rounded-[10px]"
                  style={{
                    background: `linear-gradient(135deg, hsl(${260 + i * 20} 50% 25%), hsl(${290 + i * 15} 50% 15%))`,
                  }}
                />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-white">{b.n}</div>
                  <div className="mt-0.5 text-[10px] text-white/55">{b.t}</div>
                </div>
                <div className={`text-[10px] font-semibold ${venueAccent(b.p)}`}>{b.p}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
