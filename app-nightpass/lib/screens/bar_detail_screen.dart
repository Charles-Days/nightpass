import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_capacity.dart';
import '../widgets/np_chip.dart';
import '../widgets/np_glass.dart';
import '../widgets/np_photo.dart';

class BarDetailScreen extends StatelessWidget {
  const BarDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          Positioned.fill(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 130),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    height: 320,
                    child: Stack(
                      children: [
                        const NPPhoto(
                          label: 'lumen.hero.jpg',
                          height: 320,
                          hue: 280,
                          borderRadius: BorderRadius.zero,
                        ),
                        Positioned.fill(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.black.withValues(alpha: 0.4),
                                  Colors.transparent,
                                  NPColors.base,
                                ],
                                stops: const [0.0, 0.30, 1.0],
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 56,
                          left: 16,
                          right: 16,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              GestureDetector(
                                onTap: () => context.canPop() ? context.pop() : context.go('/home'),
                                child: _circleBtn(Icons.arrow_back_ios_new_rounded, NPColors.text),
                              ),
                              Row(
                                children: [
                                  _circleBtn(Icons.ios_share_rounded, NPColors.text),
                                  const SizedBox(width: 8),
                                  _circleBtn(Icons.favorite, NPColors.magenta),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const Positioned(
                          top: 56,
                          left: 0,
                          right: 0,
                          child: Center(
                            child: NPChip(tone: NPChipTone.live, child: Text('● OPEN · LIVE')),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Transform.translate(
                    offset: const Offset(0, -60),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Lumen', style: NPTextStyles.display(32, letterSpacing: -0.025)),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.star, size: 14, color: NPColors.warning),
                              const SizedBox(width: 4),
                              Text('4.8 · 1.2k', style: NPTextStyles.body(13, color: NPColors.textDim)),
                              const SizedBox(width: 14),
                              Text('· Rooftop · Cocktails', style: NPTextStyles.body(13, color: NPColors.textDim)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(Icons.location_on_outlined, size: 14, color: NPColors.textDim),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Av. Álvaro Obregón 185, Roma Norte · 0.4 km',
                                  style: NPTextStyles.body(13, color: NPColors.textDim),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          const Wrap(
                            spacing: 6,
                            children: [
                              NPChip(tone: NPChipTone.hero, child: Text('TRENDING #2')),
                              NPChip(child: Text('21+')),
                              NPChip(child: Text('SMART CASUAL')),
                            ],
                          ),
                          const SizedBox(height: 20),
                          NPGlass(
                            radius: 18,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('LIVE CAPACITY', style: NPTextStyles.label(spacing: 0.1)),
                                          const SizedBox(height: 4),
                                          Text('72% full · ~12 min wait',
                                              style: NPTextStyles.heading(20, w: FontWeight.w600)),
                                        ],
                                      ),
                                    ),
                                    const NPChip(tone: NPChipTone.live, child: Text('● UPDATING')),
                                  ],
                                ),
                                const SizedBox(height: 14),
                                const NPCapacity(pct: 72, label: ''),
                                const SizedBox(height: 14),
                                Row(
                                  children: [
                                    Icon(Icons.people_outline, size: 14, color: NPColors.textDim),
                                    const SizedBox(width: 4),
                                    Text('312 / 430', style: NPTextStyles.body(12, color: NPColors.textDim)),
                                    const SizedBox(width: 18),
                                    Icon(Icons.access_time, size: 14, color: NPColors.textDim),
                                    const SizedBox(width: 4),
                                    Text('Closes 03:00', style: NPTextStyles.body(12, color: NPColors.textDim)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),
                          Text('About', style: NPTextStyles.heading(14, w: FontWeight.w600)),
                          const SizedBox(height: 8),
                          Text(
                            'Twelve floors above Roma. House cocktails, slow electronic, panoramic skyline. House DJs Thu–Sat from 22h.',
                            style: NPTextStyles.body(14, color: NPColors.textDim, height: 1.55),
                          ),
                          const SizedBox(height: 22),
                          Text('Tonight', style: NPTextStyles.heading(14, w: FontWeight.w600)),
                          const SizedBox(height: 10),
                          GestureDetector(
                            onTap: () => context.go('/event'),
                            child: NPGlass(
                              padding: const EdgeInsets.all(12),
                              radius: 14,
                              child: Row(
                                children: [
                                  Container(
                                    width: 56,
                                    height: 56,
                                    decoration: BoxDecoration(
                                      gradient: const LinearGradient(
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                        colors: [NPColors.hero, NPColors.magenta],
                                      ),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Center(
                                      child: Text('SAT',
                                          style: NPTextStyles.label(color: Colors.white, size: 11, spacing: 0.1)
                                              .copyWith(fontWeight: FontWeight.w700)),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('KAIROS — opening night',
                                            style: NPTextStyles.heading(14, w: FontWeight.w600)),
                                        const SizedBox(height: 2),
                                        Text('23:00 · with Mara Linn (b2b)',
                                            style: NPTextStyles.body(12, color: NPColors.textDim)),
                                      ],
                                    ),
                                  ),
                                  Text('\$270',
                                      style: NPTextStyles.heading(14, w: FontWeight.w600, color: NPColors.hero)),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 130),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, NPColors.base.withValues(alpha: 0.92)],
                  stops: const [0, 0.3],
                ),
              ),
              child: NPGlass(
                padding: const EdgeInsets.all(10),
                radius: 20,
                child: Row(
                  children: [
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('COVER FROM', style: NPTextStyles.label(size: 11, spacing: 0.08)),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.baseline,
                              textBaseline: TextBaseline.alphabetic,
                              children: [
                                Text('\$180', style: NPTextStyles.display(22)),
                                const SizedBox(width: 4),
                                Text('· tonight',
                                    style: NPTextStyles.body(13, color: NPColors.textDim, w: FontWeight.w500)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    NPPrimary(
                      onPressed: () => context.go('/checkout'),
                      child: const Text('Buy cover'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _circleBtn(IconData icon, Color color) {
    return ClipOval(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.45),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
          ),
          child: Center(child: Icon(icon, size: 18, color: color)),
        ),
      ),
    );
  }
}
