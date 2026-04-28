import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/np_theme.dart';

class NPPhoto extends StatelessWidget {
  final String label;
  final double? height;
  final double hue;
  final BorderRadius? borderRadius;

  const NPPhoto({
    super.key,
    this.label = 'photo.jpg',
    this.height = 180,
    this.hue = 280,
    this.borderRadius,
  });

  Color _hsl(double h, double s, double l) =>
      HSLColor.fromAHSL(1, h % 360, s, l).toColor();

  @override
  Widget build(BuildContext context) {
    final r = borderRadius ?? BorderRadius.circular(16);
    return ClipRRect(
      borderRadius: r,
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: Stack(
          children: [
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [_hsl(hue, 0.40, 0.18), _hsl(hue + 30, 0.50, 0.10)],
                  ),
                ),
              ),
            ),
            Positioned.fill(
              child: Opacity(
                opacity: 0.35,
                child: CustomPaint(painter: _DiagonalStripes()),
              ),
            ),
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.transparent, Colors.black.withValues(alpha: 0.55)],
                    stops: const [0.4, 1.0],
                  ),
                ),
              ),
            ),
            if (label.isNotEmpty)
              Positioned(
                left: 10,
                bottom: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                  ),
                  child: Text(
                    label,
                    style: GoogleFonts.firaCode(
                      fontSize: 10,
                      letterSpacing: 0.4,
                      color: NPColors.text.withValues(alpha: 0.55),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _DiagonalStripes extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.06)
      ..strokeWidth = 2;
    const gap = 14.0;
    final maxLen = size.width + size.height;
    for (double i = -size.height; i < maxLen; i += gap) {
      canvas.drawLine(Offset(i, 0), Offset(i + size.height, size.height), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
