import 'dart:math' as math;
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import '../theme/np_theme.dart';

/// NightPass app backdrop — concept: "Velvet Midnight".
///
/// A near-black canvas saturated with deep velvet purple, anchored by
/// a single warm ember (a distant sodium lamp through fog) that gives
/// the composition its emotional center. Static film grain prevents
/// OLED banding and gives the dark an analog, fabric-like quality.
///
/// Composition (back to front):
///   1. Base       — vertical violet-black wash
///   2. Velvet TL  — deep2 bloom, top-left, very low alpha
///   3. Velvet BR  — deep bloom, bottom-right, very low alpha
///   4. Cool focal — hero-purple glow upper-right
///   5. THE EMBER  — tight amber bloom lower-left (the signature)
///   6. Grain      — film texture, cached, mixed warm/cool/neutral tints
///   7. Vignette   — barely-there edge fall-off to focus content
class NPBackdrop extends StatelessWidget {
  final Widget? child;
  const NPBackdrop({super.key, this.child});

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: Stack(
        children: [
          // 1. Base — vertical violet-black
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF07050D),
                    Color(0xFF0C0418),
                    Color(0xFF030107),
                  ],
                  stops: [0, 0.55, 1],
                ),
              ),
            ),
          ),

          // 2. Velvet bloom — top-left (deep2, ambient depth)
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(-0.7, -0.85),
                  radius: 1.4,
                  colors: [
                    NPColors.deep2.withValues(alpha: 0.32),
                    NPColors.deep2.withValues(alpha: 0.10),
                    Colors.transparent,
                  ],
                  stops: const [0, 0.4, 0.85],
                ),
              ),
            ),
          ),

          // 3. Velvet bloom — bottom-right (deep, ambient depth)
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(0.85, 0.95),
                  radius: 1.2,
                  colors: [
                    NPColors.deep.withValues(alpha: 0.42),
                    NPColors.deep.withValues(alpha: 0.12),
                    Colors.transparent,
                  ],
                  stops: const [0, 0.45, 0.9],
                ),
              ),
            ),
          ),

          // 4. Cool focal — hero purple glow upper-right
          // Quietly states the brand color without dominating.
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(0.55, -0.55),
                  radius: 0.75,
                  colors: [
                    NPColors.hero.withValues(alpha: 0.075),
                    NPColors.hero.withValues(alpha: 0.025),
                    Colors.transparent,
                  ],
                  stops: const [0, 0.5, 1],
                ),
              ),
            ),
          ),

          // 5. THE EMBER — the signature.
          // A single tight warm bloom: distant sodium lamp through fog.
          // Lower-left, slightly off-axis. Restrained alpha (~6% peak)
          // keeps it subtle yet emotionally anchored.
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(-0.35, 0.45),
                  radius: 0.55,
                  colors: [
                    NPColors.neonAmber.withValues(alpha: 0.060),
                    NPColors.neonOrange.withValues(alpha: 0.030),
                    Colors.transparent,
                  ],
                  stops: const [0, 0.4, 0.85],
                ),
              ),
            ),
          ),

          // 6. Grain — film-emulsion texture (static, cached).
          // Breaks OLED banding. Mixed neutral/violet/amber tints sympathetic
          // to the wash above. shouldRepaint=false → painted once.
          const Positioned.fill(
            child: IgnorePointer(
              child: CustomPaint(
                painter: _GrainPainter(),
                isComplex: true,
                willChange: false,
              ),
            ),
          ),

          // 7. Vignette — barely-there edge fall-off
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 1.3,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.20),
                  ],
                  stops: const [0.55, 1],
                ),
              ),
            ),
          ),

          if (child != null) Positioned.fill(child: child!),
        ],
      ),
    );
  }
}

/// Static film-grain texture. Pseudo-random distribution, three tint families
/// (neutral / cool violet / warm amber) at very low alphas.
///
/// Performance: the 1500 drawCircle calls are recorded to a [ui.Picture] once
/// per device size and cached process-wide. Subsequent screens reuse the
/// cached picture via `canvas.drawPicture` — a near-free op. So even though
/// every screen mounts a fresh NPBackdrop, the heavy grain rasterization
/// happens only on the first paint after a size change.
class _GrainPainter extends CustomPainter {
  const _GrainPainter();

  static const int _seed = 137;
  static const int _grainCount = 1500;
  static const Color _coolTint = Color(0xFFB266FF);
  static const Color _warmTint = Color(0xFFFFA94D);

  static ui.Picture? _cached;
  static Size _cachedSize = Size.zero;

  static ui.Picture _record(Size size) {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder, Offset.zero & size);
    final rand = math.Random(_seed);
    final paint = Paint()..isAntiAlias = false;

    for (int i = 0; i < _grainCount; i++) {
      final x = rand.nextDouble() * size.width;
      final y = rand.nextDouble() * size.height;
      final r = 0.4 + rand.nextDouble() * 0.7;

      final tint = rand.nextDouble();
      final Color base;
      if (tint < 0.70) {
        base = Colors.white;
      } else if (tint < 0.90) {
        base = _coolTint;
      } else {
        base = _warmTint;
      }
      final alpha = 0.012 + rand.nextDouble() * 0.025;
      paint.color = base.withValues(alpha: alpha);
      canvas.drawCircle(Offset(x, y), r, paint);
    }
    return recorder.endRecording();
  }

  @override
  void paint(Canvas canvas, Size size) {
    if (_cached == null || _cachedSize != size) {
      _cached?.dispose();
      _cached = _record(size);
      _cachedSize = size;
    }
    canvas.drawPicture(_cached!);
  }

  @override
  bool shouldRepaint(covariant _GrainPainter oldDelegate) => false;
}
