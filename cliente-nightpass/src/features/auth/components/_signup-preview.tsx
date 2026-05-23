'use client';

interface SignupPreviewProps {
  name?: string;
}

export function SignupPreview({ name }: SignupPreviewProps) {
  const display = (name?.trim() || 'Tu nombre').split(/\s+/)[0];
  const tonightVenues = [
    { name: 'Bar Demo', genre: 'House · Centro', price: '$120', highlight: true },
    { name: 'Ayahuasca', genre: 'Latino · próximo', price: '—', highlight: false },
  ];

  return (
    <div className="relative flex h-full items-center justify-center p-6 lg:p-10">
      <div
        aria-hidden
        className="absolute inset-[4%_8%] rounded-[28px] border border-primary/20"
        style={{
          background:
            'linear-gradient(160deg, rgba(168,85,247,0.16), rgba(236,72,153,0.08))',
        }}
      />

      <div
        className="relative w-[300px] rounded-[36px] p-2 shadow-[0_50px_100px_-20px_rgba(168,85,247,0.55),inset_0_0_0_1.5px_rgba(255,255,255,0.08)] sm:w-[320px]"
        style={{
          background: 'linear-gradient(160deg, #2a2235, #0a0712)',
          transform: 'rotate(-3deg)',
        }}
      >
        <div className="overflow-hidden rounded-[28px] bg-[#0a0712]">
          {/* Notch */}
          <div className="relative h-8">
            <div className="absolute left-1/2 top-2 h-[22px] w-20 -translate-x-1/2 rounded-full bg-black" />
          </div>

          <div className="px-3.5 pb-4 pt-2">
            {/* Membership card */}
            <div
              className="relative overflow-hidden rounded-[18px] p-[18px]"
              style={{
                background:
                  'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #4f1d8a 100%)',
              }}
            >
              <div
                aria-hidden
                className="absolute -right-10 -top-10 size-36 rounded-full blur-xl"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              />
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/80">
                NIGHTPASS · INSIDER
              </p>
              <p className="mt-7 truncate font-display text-xl font-bold leading-tight tracking-tight text-white">
                {display}
              </p>
              <p className="mt-1.5 font-mono text-[10px] tracking-wider text-white/70">
                NP-2026-04812
              </p>
            </div>

            {/* Tonight section */}
            <p className="mt-3.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Esta noche · CDMX
            </p>
            <ul className="mt-1">
              {tonightVenues.map((v, i, arr) => (
                <li
                  key={v.name}
                  className={`flex items-center gap-2.5 py-2 ${i < arr.length - 1 ? 'border-b border-white/8' : ''}`}
                >
                  <span
                    className="size-7 shrink-0 rounded-[7px]"
                    style={{
                      background: `linear-gradient(135deg, hsl(${280 + i * 30},45%,28%), hsl(${320 + i * 20},40%,18%))`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{v.name}</p>
                    <p className="mt-0.5 truncate text-[9.5px] text-white/55">{v.genre}</p>
                  </div>
                  <p
                    className={`text-[10px] font-bold ${v.highlight ? 'text-primary' : 'text-white/35'}`}
                  >
                    {v.price}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        ↑ Esto es lo que desbloqueas
      </p>
    </div>
  );
}
