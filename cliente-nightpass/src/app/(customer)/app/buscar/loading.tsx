export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
      {/* Eyebrow + heading */}
      <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-3 h-8 w-2/3 animate-pulse rounded-lg bg-white/[0.06]" />
      <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-white/[0.04]" />

      {/* Search input skeleton */}
      <div className="mt-6 h-11 w-full animate-pulse rounded-xl bg-white/[0.06]" />

      {/* Filter chips */}
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 animate-pulse rounded-full bg-white/[0.05]"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>

      {/* Results grid */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[16/10] animate-pulse rounded-[22px] bg-white/[0.04]"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
