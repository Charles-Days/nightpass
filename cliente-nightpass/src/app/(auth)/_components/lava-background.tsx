export function LavaBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      <div className="lava-aurora" />
      <div className="lava-blob lava-blob-1" />
      <div className="lava-blob lava-blob-2" />
      <div className="lava-blob lava-blob-3" />
      <div className="lava-blob lava-blob-4" />
      <div className="lava-spark lava-spark-1" />
      <div className="lava-spark lava-spark-2" />
      <div className="lava-spark lava-spark-3" />
      <div className="lava-vignette" />
    </div>
  );
}
