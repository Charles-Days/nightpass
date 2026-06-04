export default function MiLocalLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-[22px] border border-white/14 bg-white/[0.05]" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-[22px] border border-white/14 bg-white/[0.05]" />
    </div>
  );
}
