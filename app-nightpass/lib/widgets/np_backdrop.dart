import 'package:flutter/material.dart';
import '../theme/np_theme.dart';

class NPBackdrop extends StatelessWidget {
  final Widget? child;
  const NPBackdrop({super.key, this.child});

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: Stack(
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: const BoxDecoration(color: NPColors.base),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(-0.6, -1),
                  radius: 1.2,
                  colors: [NPColors.deep2, NPColors.deep2.withValues(alpha: 0)],
                  stops: const [0, 0.55],
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(1, -0.6),
                  radius: 0.85,
                  colors: [
                    NPColors.hero.withValues(alpha: 0.18),
                    NPColors.hero.withValues(alpha: 0),
                  ],
                  stops: const [0, 0.6],
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(0, 1),
                  radius: 1.2,
                  colors: [NPColors.deep, NPColors.deep.withValues(alpha: 0)],
                  stops: const [0, 0.6],
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
