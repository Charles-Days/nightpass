import 'dart:math' as math;

import 'package:flutter/material.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_logo.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _intro;
  late final AnimationController _pulse;
  late final AnimationController _daynight;

  static const _title = 'NightPass';

  @override
  void initState() {
    super.initState();
    _intro = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..forward();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);
    _daynight = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..forward();
  }

  @override
  void dispose() {
    _intro.dispose();
    _pulse.dispose();
    _daynight.dispose();
    super.dispose();
  }

  double _at(double start, double end, {Curve curve = Curves.easeOutCubic}) {
    return Interval(start, end, curve: curve).transform(_intro.value);
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),

          // Intro veil — "Ember Awakens".
          // Black veil fades out as a single warm ember ignites in the
          // same position as the backdrop's permanent ember, so the
          // transition into NPBackdrop is invisible.
          AnimatedBuilder(
            animation: _daynight,
            builder: (context, _) {
              return IgnorePointer(
                child: _VelvetIntroLayer(t: _daynight.value),
              );
            },
          ),

          // Halo pulsante detrás del logo
          AnimatedBuilder(
            animation: _pulse,
            builder: (context, _) {
              final t = Curves.easeInOut.transform(_pulse.value);
              final scale = 0.85 + t * 0.28;
              final alpha = 0.32 + t * 0.30;
              return Positioned(
                top: size.height * 0.16,
                left: 0,
                right: 0,
                child: Center(
                  child: IgnorePointer(
                    child: Transform.scale(
                      scale: scale,
                      child: Container(
                        width: 400,
                        height: 400,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(
                            colors: [
                              NPColors.hero.withValues(alpha: alpha),
                              NPColors.magenta.withValues(alpha: alpha * 0.4),
                              Colors.transparent,
                            ],
                            stops: const [0, 0.4, 0.75],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),

          // Logo + título + tagline
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AnimatedBuilder(
                  animation: Listenable.merge([_intro, _pulse]),
                  builder: (context, _) {
                    final intro = _at(0, 0.45, curve: Curves.easeOutBack);
                    final breathing =
                        1 + Curves.easeInOut.transform(_pulse.value) * 0.05;
                    final scale = (0.65 + intro * 0.35) * breathing;
                    final opacity = _at(0, 0.35);
                    return Opacity(
                      opacity: opacity,
                      child: Transform.scale(
                        scale: scale,
                        child: const NPLogo(size: 96, withWord: false),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 32),

                // Letra por letra
                AnimatedBuilder(
                  animation: _intro,
                  builder: (context, _) {
                    return Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: _title.split('').asMap().entries.map((entry) {
                        final i = entry.key;
                        final char = entry.value;
                        final start = 0.32 + i * 0.045;
                        final end = math.min(start + 0.22, 1.0);
                        final t = Interval(start, end,
                                curve: Curves.easeOutCubic)
                            .transform(_intro.value);
                        return Opacity(
                          opacity: t,
                          child: Transform.translate(
                            offset: Offset(0, (1 - t) * 16),
                            child: Text(
                              char,
                              style: NPTextStyles.display(
                                46,
                                w: FontWeight.w700,
                                letterSpacing: -0.03,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    );
                  },
                ),

                const SizedBox(height: 16),

                // Línea glowing bajo el título
                AnimatedBuilder(
                  animation: _intro,
                  builder: (context, _) {
                    final t = _at(0.55, 0.95);
                    return Container(
                      width: 80 * t,
                      height: 2,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [
                            Colors.transparent,
                            NPColors.hero,
                            Colors.transparent,
                          ],
                          stops: [0, 0.5, 1],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: NPColors.hero.withValues(alpha: 0.6 * t),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                    );
                  },
                ),

                const SizedBox(height: 18),

                // Tagline
                AnimatedBuilder(
                  animation: _intro,
                  builder: (context, _) {
                    final t = _at(0.72, 0.98);
                    return Opacity(
                      opacity: t,
                      child: Transform.translate(
                        offset: Offset(0, (1 - t) * 8),
                        child: Text(
                          'Tu acceso a la mejor noche.',
                          style: NPTextStyles.body(
                            16,
                            color: NPColors.textDim,
                            height: 1.5,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),

          // Loader pulsante abajo
          Positioned(
            bottom: 90,
            left: 0,
            right: 0,
            child: AnimatedBuilder(
              animation: _intro,
              builder: (context, child) =>
                  Opacity(opacity: _at(0.85, 1.0), child: child),
              child: const _PulsingBars(),
            ),
          ),
        ],
      ),
    );
  }
}

/// Intro veil for splash. Concept: "Ember Awakens".
///
/// Sequence over t in [0, 1]:
///   0.00–0.10  — pure black veil (anticipation)
///   0.10–0.35  — ember ignites lower-left and grows (easeOut)
///   0.30–0.48  — single heartbeat pulse on the ember
///   0.38–0.83  — one ripple radiates outward
///   0.00–1.00  — black veil fades to transparent revealing NPBackdrop
///
/// The ember position matches the backdrop's permanent ember exactly,
/// so when the veil clears the user sees no jump — just one warm light
/// that has always been there.
class _VelvetIntroLayer extends StatelessWidget {
  final double t;
  const _VelvetIntroLayer({required this.t});

  static const Alignment _emberCenter = Alignment(-0.35, 0.45);

  @override
  Widget build(BuildContext context) {
    // Veil — black covers backdrop initially, eases out by t=1
    final veilAlpha = (1 - Curves.easeOutCubic.transform(t)).clamp(0.0, 1.0);

    // Ember awakens t=0.10 → 0.35
    final emberT = ((t - 0.10) / 0.25).clamp(0.0, 1.0);
    final emberAlpha = Curves.easeOutCubic.transform(emberT);

    // Single heartbeat — one half-sine wave, peaks ~t=0.39
    final beatT = ((t - 0.30) / 0.18).clamp(0.0, 1.0);
    final beat = (beatT > 0 && beatT < 1)
        ? math.sin(beatT * math.pi)
        : 0.0;

    // Ripple — single wave radiating from ember
    final rippleT = ((t - 0.38) / 0.45).clamp(0.0, 1.0);
    final rippleProgress = Curves.easeOut.transform(rippleT);
    final rippleAlpha = rippleT > 0 ? (1 - rippleT) * 0.22 : 0.0;

    return Stack(
      children: [
        // Veil — solid near-black hiding NPBackdrop initially
        Positioned.fill(
          child: ColoredBox(
            color: const Color(0xFF030107).withValues(alpha: veilAlpha),
          ),
        ),

        // Ember bloom (with heartbeat scale + alpha modulation)
        if (emberAlpha > 0)
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: _emberCenter,
                  radius: 0.50 + beat * 0.10,
                  colors: [
                    NPColors.neonAmber.withValues(
                      alpha: (0.22 + beat * 0.12) * emberAlpha,
                    ),
                    NPColors.neonOrange.withValues(
                      alpha: 0.10 * emberAlpha,
                    ),
                    Colors.transparent,
                  ],
                  stops: const [0, 0.4, 0.85],
                ),
              ),
            ),
          ),

        // Concentric ripple radiating from ember
        if (rippleAlpha > 0)
          Positioned.fill(
            child: CustomPaint(
              painter: _RipplePainter(
                center: _emberCenter,
                progress: rippleProgress,
                color: NPColors.neonAmber.withValues(alpha: rippleAlpha),
              ),
            ),
          ),
      ],
    );
  }
}

/// Soft glowing ring expanding from a center point.
class _RipplePainter extends CustomPainter {
  final Alignment center;
  final double progress; // 0..1, normalized expansion
  final Color color;

  const _RipplePainter({
    required this.center,
    required this.progress,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cx = (center.x + 1) / 2 * size.width;
    final cy = (center.y + 1) / 2 * size.height;
    final maxR = math.max(size.width, size.height) * 0.85;
    final r = 30 + progress * maxR;

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10);
    canvas.drawCircle(Offset(cx, cy), r, paint);
  }

  @override
  bool shouldRepaint(covariant _RipplePainter old) =>
      old.progress != progress || old.color != color;
}

class _PulsingBars extends StatefulWidget {
  const _PulsingBars();

  @override
  State<_PulsingBars> createState() => _PulsingBarsState();
}

class _PulsingBarsState extends State<_PulsingBars>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) {
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(3, (i) {
            final phase = (_c.value - i * 0.18 + 1) % 1;
            final t = math.sin(phase * math.pi).clamp(0.0, 1.0);
            final width = 10 + t * 18;
            final color = Color.lerp(
              Colors.white.withValues(alpha: 0.16),
              NPColors.hero,
              t,
            )!;
            return Container(
              width: width,
              height: 3,
              margin: const EdgeInsets.symmetric(horizontal: 3),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(2),
                boxShadow: t > 0.4
                    ? [
                        BoxShadow(
                          color: NPColors.hero.withValues(alpha: t * 0.7),
                          blurRadius: 10,
                          spreadRadius: -1,
                        ),
                      ]
                    : null,
              ),
            );
          }),
        );
      },
    );
  }
}
