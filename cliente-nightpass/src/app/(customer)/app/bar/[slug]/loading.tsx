export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
      {/* Back link */}
      <div className="h-4 w-20 animate-pulse rounded bg-white/[0.08]" />

      {/* Hero card — aspect-video + overlay content */}
      <div className="mt-5 overflow-hidden rounded-[22px] border border-white/14 bg-white/[0.05]">
        <div className="relative aspect-video w-full animate-pulse bg-white/[0.09] sm:aspect-[16/9]">
          {/* gradient overlay skeleton */}
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-white/[0.11]" />
            <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-white/[0.09]" />
            <div className="mt-3 flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-6 w-16 animate-pulse rounded-full bg-white/[0.10]"
                  style={{ animationDelay: `${i * 40}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
        {/* description row */}
        <div className="border-t border-white/12 p-5 sm:p-8">
          <div className="h-4 w-full animate-pulse rounded bg-white/[0.08]" />
          <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-white/[0.07]" />
        </div>
      </div>

      {/* Events section */}
      <div className="mt-8">
        <div className="mb-4 h-6 w-40 animate-pulse rounded-lg bg-white/[0.09]" />
        <ul className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="flex items-stretch gap-4 overflow-hidden rounded-[20px] border border-white/14 bg-white/[0.05] p-3 sm:p-4"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="h-24 w-24 shrink-0 animate-pulse rounded-[14px] bg-white/[0.09] sm:h-28 sm:w-32" />
              <div className="flex flex-1 flex-col justify-center gap-2">
                <div className="h-3 w-24 animate-pulse rounded bg-white/[0.09]" />
                <div className="h-5 w-3/4 animate-pulse rounded-lg bg-white/[0.09]" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.07]" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
