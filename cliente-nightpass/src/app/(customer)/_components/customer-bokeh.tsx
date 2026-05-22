export function CustomerBokeh() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute rounded-full"
        style={{
          top: '-10%',
          left: '-5%',
          width: 460,
          height: 460,
          filter: 'blur(140px)',
          opacity: 0.28,
          background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: '35%',
          right: '-10%',
          width: 520,
          height: 520,
          filter: 'blur(160px)',
          opacity: 0.22,
          background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          bottom: '-15%',
          left: '30%',
          width: 480,
          height: 480,
          filter: 'blur(140px)',
          opacity: 0.18,
          background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
