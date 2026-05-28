// SVG noise overlay (~1KB inline) dithera bandas residuales del gradiente sobre dark bg.
// Sin esto Android Chrome muestra anillos visibles en 8-bit color depth.
const NOISE_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

export function CustomerBokeh() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Mobile (≤640px): single static radial gradient — no blur, no animation, no GPU compositing layers. */}
      <div
        className="absolute inset-0 sm:hidden"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 10% 5%, rgba(168,85,247,0.18) 0%, rgba(168,85,247,0) 40%)',
            'radial-gradient(circle at 90% 45%, rgba(236,72,153,0.14) 0%, rgba(236,72,153,0) 45%)',
            'radial-gradient(circle at 50% 95%, rgba(79,70,229,0.14) 0%, rgba(79,70,229,0) 45%)',
          ].join(','),
        }}
      />

      {/* Desktop/tablet: keeps richer bokeh with blur + animated opacity. */}
      <div className="hidden sm:block">
        <div
          className="np-bokeh-a absolute rounded-full transform-gpu"
          style={{
            top: '-10%',
            left: '-5%',
            width: 460,
            height: 460,
            filter: 'blur(90px)',
            background:
              'radial-gradient(circle, rgba(168,85,247,0.55) 0%, rgba(168,85,247,0.32) 30%, rgba(168,85,247,0.12) 55%, rgba(168,85,247,0.03) 75%, rgba(168,85,247,0) 100%)',
          }}
        />
        <div
          className="np-bokeh-b absolute rounded-full transform-gpu"
          style={{
            top: '35%',
            right: '-10%',
            width: 520,
            height: 520,
            filter: 'blur(100px)',
            background:
              'radial-gradient(circle, rgba(236,72,153,0.45) 0%, rgba(236,72,153,0.26) 30%, rgba(236,72,153,0.10) 55%, rgba(236,72,153,0.03) 75%, rgba(236,72,153,0) 100%)',
          }}
        />
        <div
          className="np-bokeh-c absolute rounded-full transform-gpu"
          style={{
            bottom: '-15%',
            left: '30%',
            width: 480,
            height: 480,
            filter: 'blur(90px)',
            background:
              'radial-gradient(circle, rgba(79,70,229,0.40) 0%, rgba(79,70,229,0.22) 30%, rgba(79,70,229,0.09) 55%, rgba(79,70,229,0.02) 75%, rgba(79,70,229,0) 100%)',
          }}
        />
        <div
          className="absolute inset-0 mix-blend-overlay opacity-[0.5]"
          style={{
            backgroundImage: NOISE_SVG,
            backgroundRepeat: 'repeat',
          }}
        />
      </div>
    </div>
  );
}
