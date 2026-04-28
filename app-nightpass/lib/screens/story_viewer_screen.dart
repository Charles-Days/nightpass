import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/np_theme.dart';
import '../widgets/np_button.dart';
import '../widgets/np_chip.dart';
import '../widgets/np_photo.dart';

class StoryViewerScreen extends StatelessWidget {
  const StoryViewerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          const Positioned.fill(
            child: NPPhoto(label: 'lumen.live.story.mov', height: null, hue: 280, borderRadius: BorderRadius.zero),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    NPColors.deep.withValues(alpha: 0.45),
                    Colors.transparent,
                    Colors.transparent,
                    NPColors.base.withValues(alpha: 0.95),
                  ],
                  stops: const [0, 0.25, 0.6, 1],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
              child: Row(
                children: List.generate(5, (i) {
                  final progress = [100, 100, 64, 0, 0][i] / 100.0;
                  return Expanded(
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                      height: 2.5,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(2),
                      ),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: FractionallySizedBox(
                          widthFactor: progress,
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(2),
                              boxShadow: progress > 0 && progress < 1
                                  ? [const BoxShadow(color: Colors.white, blurRadius: 6)]
                                  : null,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 18,
            left: 14,
            right: 14,
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: SweepGradient(
                      colors: [NPColors.hero, NPColors.magenta, NPColors.cyan, NPColors.hero],
                      startAngle: 2.4,
                      endAngle: 8.7,
                    ),
                  ),
                  padding: const EdgeInsets.all(1.5),
                  child: Container(
                    decoration: const BoxDecoration(shape: BoxShape.circle, color: NPColors.base),
                    margin: const EdgeInsets.all(2),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text('Lumen',
                              style: NPTextStyles.heading(14, w: FontWeight.w600, color: Colors.white)),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                            decoration: BoxDecoration(
                              color: NPColors.success,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text('LIVE',
                                style: NPTextStyles.heading(9, w: FontWeight.w700,
                                    color: const Color(0xFF062C12))
                                    .copyWith(letterSpacing: 0.7)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text('2 min ago · 142 watching',
                          style: NPTextStyles.body(11, color: Colors.white.withValues(alpha: 0.7))),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => context.canPop() ? context.pop() : context.go('/stories'),
                  child: const Icon(Icons.close_rounded, size: 24, color: Colors.white),
                ),
              ],
            ),
          ),
          Positioned(
            top: MediaQuery.of(context).size.height * 0.36,
            right: 22,
            child: Transform.rotate(
              angle: -0.105,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 30, offset: const Offset(0, 12))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('CAPACITY',
                        style: NPTextStyles.heading(9, w: FontWeight.w700, color: const Color(0xFF6B21A8))
                            .copyWith(letterSpacing: 1.0)),
                    Text('72%',
                        style: NPTextStyles.display(22, color: const Color(0xFF0A0A0F))),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 22,
            right: 22,
            bottom: 132,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mara Linn just dropped the first set of the night ✨',
                  style: NPTextStyles.heading(22, w: FontWeight.w600, color: Colors.white).copyWith(
                    height: 1.2,
                    shadows: [
                      Shadow(color: Colors.black.withValues(alpha: 0.6), blurRadius: 12, offset: const Offset(0, 2)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                const Row(
                  children: [
                    NPChip(tone: NPChipTone.hero, child: Text('COVER · \$180')),
                    SizedBox(width: 8),
                    NPChip(child: Text('21+ · OPEN')),
                  ],
                ),
              ],
            ),
          ),
          Positioned(
            left: 14,
            right: 14,
            bottom: 50,
            child: Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.06),
                          borderRadius: BorderRadius.circular(22),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                        ),
                        child: Text('Send a message…',
                            style: NPTextStyles.body(13, color: Colors.white.withValues(alpha: 0.6))),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.06),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                  ),
                  child: const Icon(Icons.favorite_border, size: 20, color: Colors.white),
                ),
                const SizedBox(width: 10),
                NPPrimary(
                  onPressed: () => context.go('/checkout'),
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  radius: 22,
                  child: const Text('Buy cover →'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
