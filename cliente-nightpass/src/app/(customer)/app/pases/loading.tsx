export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
      {/* Eyebrow + heading */}
      <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-3 h-9 w-1/2 animate-pulse rounded-lg bg-white/[0.06]" />
      <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-white/[0.04]" />

      {/* Pass list */}
      <ul className="mt-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="flex items-stretch gap-4 rounded-[20px] border border-white/10 bg-white/[0.025] p-3 sm:p-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Thumbnail */}
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-[14px] bg-white/[0.06] sm:h-28 sm:w-32" />

            {/* Content */}
            <div className="flex flex-1 flex-col justify-center gap-2">
              <div className="h-5 w-3/4 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.05]" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.05]" />
            </div>

            {/* Status badge */}
            <div className="flex shrink-0 items-center">
              <div className="h-6 w-16 animate-pulse rounded-full bg-white/[0.05]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
