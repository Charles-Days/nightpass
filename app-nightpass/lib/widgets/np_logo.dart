import 'package:flutter/material.dart';
import '../theme/np_theme.dart';

class NPLogo extends StatelessWidget {
  final double size;
  final bool withWord;

  const NPLogo({super.key, this.size = 40, this.withWord = true});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: size,
          height: size,
          child: CustomPaint(painter: _TicketMoonPainter()),
        ),
        if (withWord) ...[
          SizedBox(width: size * 0.25),
          Text(
            'NightPass',
            style: NPTextStyles.display(size * 0.5, w: FontWeight.w700),
          ),
        ],
      ],
    );
  }
}

class _TicketMoonPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final ticketRect = Rect.fromLTRB(0, h * 0.10, w, h * 0.90);
    final ticketRRect =
        RRect.fromRectAndRadius(ticketRect, Radius.circular(w * 0.10));
    final ticketPath = Path()..addRRect(ticketRRect);

    final notchR = w * 0.085;
    final cy = h * 0.5;
    final leftNotch = Path()
      ..addOval(Rect.fromCircle(center: Offset(0, cy), radius: notchR));
    final rightNotch = Path()
      ..addOval(Rect.fromCircle(center: Offset(w, cy), radius: notchR));

    final cx = w * 0.5;
    final r = w * 0.185;
    final outerMoon = Path()
      ..addOval(Rect.fromCircle(center: Offset(cx, cy), radius: r));
    final cutoutMoon = Path()
      ..addOval(Rect.fromCircle(
        center: Offset(cx + r * 0.26, cy),
        radius: r * 0.95,
      ));
    final crescent =
        Path.combine(PathOperation.difference, outerMoon, cutoutMoon);

    final t1 = Path.combine(PathOperation.difference, ticketPath, leftNotch);
    final t2 = Path.combine(PathOperation.difference, t1, rightNotch);
    final ticketFinal =
        Path.combine(PathOperation.difference, t2, crescent);

    final paint = Paint()
      ..color = NPColors.hero
      ..style = PaintingStyle.fill
      ..isAntiAlias = true;
    canvas.drawPath(ticketFinal, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
