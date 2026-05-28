'use client';

interface Props {
  total: number;
  currentIndex: number;
  currentProgress: number;
}

export function StoryProgressBars({ total, currentIndex, currentProgress }: Props) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex gap-1 px-3 pt-3">
      {Array.from({ length: total }).map((_, i) => {
        let width = 0;
        if (i < currentIndex) width = 100;
        else if (i === currentIndex) width = Math.min(100, Math.max(0, currentProgress));
        return (
          <div
            key={i}
            className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25"
          >
            <div
              className="h-full bg-white"
              style={{
                width: `${width}%`,
                transition: i === currentIndex ? 'none' : 'width 120ms linear',
                willChange: 'width',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
