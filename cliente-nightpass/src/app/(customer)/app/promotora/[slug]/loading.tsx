export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
      <div className="h-4 w-20 animate-pulse rounded bg-white/[0.05]" />

      <div className="mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]">
        <div className="relative flex items-center gap-5 p-6 sm:p-8">
          <div className="size-20 shrink-0 animate-pulse rounded-full bg-white/[0.08] sm:size-24" />
          <div className="flex-1">
            <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-2 h-7 w-2/3 animate-pulse rounded-lg bg-white/[0.08]" />
            <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-white/[0.05]" />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 h-6 w-44 animate-pulse rounded-lg bg-white/[0.06]" />
        <ul className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="flex items-stretch gap-4 overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.025] p-3 sm:p-4"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="h-24 w-24 shrink-0 animate-pulse rounded-[14px] bg-white/[0.06] sm:h-28 sm:w-32" />
              <div className="flex flex-1 flex-col justify-center gap-2">
                <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-5 w-3/4 animate-pulse rounded-lg bg-white/[0.06]" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.04]" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
