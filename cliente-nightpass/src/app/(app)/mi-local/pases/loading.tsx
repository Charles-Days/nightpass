export default function MiLocalPasesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-white/[0.07]" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-[22px] border border-white/14 bg-white/[0.05]"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="h-[320px] animate-pulse rounded-[22px] border border-white/14 bg-white/[0.05]" />
        <div className="h-[320px] animate-pulse rounded-[22px] border border-white/14 bg-white/[0.05]" />
      </div>
      <div className="h-72 animate-pulse rounded-[22px] border border-white/14 bg-white/[0.05]" />
    </div>
  );
}
