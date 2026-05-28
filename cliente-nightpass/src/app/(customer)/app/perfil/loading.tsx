export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
      {/* Back link */}
      <div className="h-4 w-20 animate-pulse rounded bg-white/[0.05]" />

      {/* Eyebrow + heading */}
      <div className="mt-6 h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-3 h-10 w-1/2 animate-pulse rounded-lg bg-white/[0.06]" />

      {/* Membership card */}
      <div className="mt-8 h-52 w-full animate-pulse rounded-[24px] bg-white/[0.04] sm:h-56" />

      {/* Stats grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-[18px] bg-white/[0.04]"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      {/* Upcoming pass + activity */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="h-44 animate-pulse rounded-[20px] bg-white/[0.04]" />
        <div className="h-44 animate-pulse rounded-[20px] bg-white/[0.04]" />
      </div>

      {/* Settings section label */}
      <div className="mt-8 h-3 w-16 animate-pulse rounded bg-white/[0.05]" />

      {/* Settings grid */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-[14px] bg-white/[0.04]"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>

      {/* Logout */}
      <div className="mt-8 h-12 animate-pulse rounded-[22px] bg-white/[0.04]" />
    </div>
  );
}
