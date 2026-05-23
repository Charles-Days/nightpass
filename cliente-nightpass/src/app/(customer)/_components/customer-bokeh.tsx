export function CustomerBokeh() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="np-bokeh-a absolute rounded-full transform-gpu"
        style={{
          top: '-10%',
          left: '-5%',
          width: 460,
          height: 460,
          filter: 'blur(140px)',
          background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
        }}
      />
      <div
        className="np-bokeh-b absolute rounded-full transform-gpu"
        style={{
          top: '35%',
          right: '-10%',
          width: 520,
          height: 520,
          filter: 'blur(160px)',
          background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)',
        }}
      />
      <div
        className="np-bokeh-c absolute rounded-full transform-gpu"
        style={{
          bottom: '-15%',
          left: '30%',
          width: 480,
          height: 480,
          filter: 'blur(140px)',
          background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
