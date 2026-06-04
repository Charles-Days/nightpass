export default function MiLocalStoriesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-72 animate-pulse rounded-[22px] border border-white/14 bg-white/[0.05]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-[18px] border border-white/14 bg-white/[0.05]"
          />
        ))}
      </div>
    </div>
  );
}
