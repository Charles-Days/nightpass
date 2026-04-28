import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_chip.dart';
import '../widgets/np_logo.dart';

class PassScreen extends StatelessWidget {
  const PassScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          Positioned(
            top: 100,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                width: 460,
                height: 460,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [NPColors.hero.withValues(alpha: 0.45), Colors.transparent],
                    stops: const [0, 0.6],
                  ),
                ),
              ),
            ),
          ),
          SafeArea(
            bottom: false,
            child: ListView(
              padding: const EdgeInsets.only(top: 8, bottom: 130),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 14),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Your pass', style: NPTextStyles.display(22)),
                      const NPChip(tone: NPChipTone.live, child: Text('● ACTIVE')),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _passCard(),
                ),
                const SizedBox(height: 20),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      Expanded(
                        child: NPGhost(
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.ios_share, size: 14),
                              SizedBox(width: 6),
                              Text('Share'),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: NPGhost(
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.location_on_outlined, size: 14),
                              SizedBox(width: 6),
                              Text('Directions'),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _passCard() {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [NPColors.deep2, NPColors.deep, NPColors.base2],
          stops: [0, 0.6, 1],
        ),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: NPColors.hero),
        boxShadow: [
          BoxShadow(
            color: NPColors.hero.withValues(alpha: 0.55),
            offset: const Offset(0, 30),
            blurRadius: 60,
            spreadRadius: -12,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 20, 22, 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('NIGHTPASS · VIP', style: NPTextStyles.label(spacing: 0.12)),
                      const SizedBox(height: 4),
                      Text('KAIROS', style: NPTextStyles.display(24)),
                      const SizedBox(height: 2),
                      Text('Lumen · Roma Norte', style: NPTextStyles.body(12, color: NPColors.textDim)),
                    ],
                  ),
                ),
                const NPLogo(size: 28, withWord: false),
              ],
            ),
          ),
          _perforation(),
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 16, 22, 8),
            child: Center(
              child: Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  color: NPColors.text,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [BoxShadow(color: NPColors.hero.withValues(alpha: 0.5), blurRadius: 32)],
                ),
                padding: const EdgeInsets.all(12),
                child: CustomPaint(painter: _QrPainter()),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 14, 22, 6),
            child: GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 14,
              childAspectRatio: 3.5,
              children: [
                _meta('DATE', 'Sat 26 Apr'),
                _meta('DOORS', '23:00'),
                _meta('HOLDER', 'Alex Moreno'),
                _meta('CODE', 'NP-K9F2-AX', mono: true),
              ],
            ),
          ),
          Container(height: 1, color: NPColors.hairline, margin: const EdgeInsets.symmetric(horizontal: 22)),
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 14, 22, 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.access_time, size: 12, color: NPColors.textDim),
                    const SizedBox(width: 6),
                    Text('Show this at the door',
                        style: NPTextStyles.body(11, color: NPColors.textDim)),
                  ],
                ),
                Text('Add to Wallet →',
                    style: NPTextStyles.heading(11, w: FontWeight.w600, color: NPColors.hero)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _meta(String k, String v, {bool mono = false}) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(k, style: NPTextStyles.label(size: 10, spacing: 0.12)),
          const SizedBox(height: 3),
          Text(
            v,
            style: mono
                ? GoogleFonts.firaCode(
                    fontSize: 13, color: NPColors.hero, fontWeight: FontWeight.w600, letterSpacing: 1.3)
                : NPTextStyles.heading(14, w: FontWeight.w600),
          ),
        ],
      );

  Widget _perforation() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 22),
      child: SizedBox(
        height: 1,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            CustomPaint(painter: _DashedLinePainter(), size: const Size(double.infinity, 1)),
            Positioned(
              left: -32,
              top: -10,
              child: Container(
                width: 20,
                height: 20,
                decoration: const BoxDecoration(color: NPColors.base, shape: BoxShape.circle),
              ),
            ),
            Positioned(
              right: -32,
              top: -10,
              child: Container(
                width: 20,
                height: 20,
                decoration: const BoxDecoration(color: NPColors.base, shape: BoxShape.circle),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DashedLinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = NPColors.hero.withValues(alpha: 0.5)
      ..strokeWidth = 1;
    const dash = 6.0;
    const gap = 6.0;
    double x = 0;
    while (x < size.width) {
      canvas.drawLine(Offset(x, 0), Offset(x + dash, 0), p);
      x += dash + gap;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _QrPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cell = size.width / 21;
    final paint = Paint()..color = const Color(0xFF0A0A0F);
    final purple = Paint()..color = NPColors.hero;

    int seed(int x, int y) {
      final v = (x * 73856093) ^ (y * 19349663) ^ ((x + y) * 83492791);
      return v & 0xFFFFFFFF;
    }

    for (int y = 0; y < 21; y++) {
      for (int x = 0; x < 21; x++) {
        final corner = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
        final innerCorner =
            (x >= 1 && x <= 5 && y >= 1 && y <= 5) ||
                (x >= 15 && x <= 19 && y >= 1 && y <= 5) ||
                (x >= 1 && x <= 5 && y >= 15 && y <= 19);
        final dot = (x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
            (x >= 16 && x <= 18 && y >= 2 && y <= 4) ||
            (x >= 2 && x <= 4 && y >= 16 && y <= 18);
        bool on;
        if (corner) {
          on = !innerCorner || dot;
        } else {
          on = (seed(x, y) % 100) < 48;
        }
        if (on) {
          canvas.drawRect(Rect.fromLTWH(x * cell, y * cell, cell, cell), paint);
        }
      }
    }
    canvas.drawRect(Rect.fromLTWH(9 * cell, 9 * cell, cell * 3, cell * 3), paint);
    canvas.drawRect(Rect.fromLTWH(9.4 * cell, 9.4 * cell, cell * 2.2, cell * 2.2), purple);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
