import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_capacity.dart';
import '../widgets/np_chip.dart';
import '../widgets/np_glass.dart';
import '../widgets/np_photo.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  static const _trending = [
    {'name': 'Lumen', 'tag': 'Rooftop · Roma Norte', 'cap': 72, 'hue': 280.0, 'label': 'lumen.hero.jpg', 'tonight': 'Live DJ · Until 3am'},
    {'name': 'Velour', 'tag': 'Cocktail bar · Condesa', 'cap': 38, 'hue': 310.0, 'label': 'velour.hero.jpg', 'tonight': 'Jazz quartet · 22:00'},
  ];
  static const _near = [
    {'name': 'Obsidiana', 'cap': 91, 'hue': 260.0},
    {'name': 'Halo', 'cap': 54, 'hue': 295.0},
    {'name': 'Cinco Sur', 'cap': 23, 'hue': 320.0},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          Positioned.fill(
            child: SafeArea(
              bottom: false,
              child: ListView(
                padding: const EdgeInsets.only(top: 12, bottom: 110),
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('TONIGHT · CDMX', style: NPTextStyles.label(size: 12, spacing: 0.08)),
                              const SizedBox(height: 2),
                              Text('Where to?', style: NPTextStyles.display(26)),
                            ],
                          ),
                        ),
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [Color(0xFF3A2356), NPColors.deep],
                            ),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
                    child: Row(
                      children: [
                        const NPChip(tone: NPChipTone.live, child: Text('● LIVE · 14 VENUES OPEN')),
                        const SizedBox(width: 8),
                        const NPChip(tone: NPChipTone.hero, child: Text('21:48')),
                      ],
                    ),
                  ),
                  _section('Trending tonight', action: 'See all'),
                  SizedBox(
                    height: 235,
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      scrollDirection: Axis.horizontal,
                      itemCount: _trending.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (_, i) {
                        final b = _trending[i];
                        return SizedBox(
                          width: 220,
                          child: NPGlass(
                            padding: EdgeInsets.zero,
                            radius: 20,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                NPPhoto(
                                  label: b['label'] as String,
                                  height: 130,
                                  hue: b['hue'] as double,
                                  borderRadius: BorderRadius.zero,
                                ),
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(b['name'] as String,
                                                style: NPTextStyles.heading(16, w: FontWeight.w600)),
                                          ),
                                          NPChip(
                                            tone: (b['cap'] as int) > 85 ? NPChipTone.magenta : NPChipTone.live,
                                            fontSize: 10,
                                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                            child: Text('${b['cap']}%'),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(b['tag'] as String,
                                          style: NPTextStyles.body(12, color: NPColors.textDim)),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          const Icon(Icons.local_fire_department_outlined,
                                              size: 14, color: NPColors.hero),
                                          const SizedBox(width: 5),
                                          Text(b['tonight'] as String,
                                              style: NPTextStyles.body(12, color: NPColors.hero)),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 24),
                  _section('Exclusive tonight'),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                    child: GestureDetector(
                      onTap: () => context.go('/event'),
                      child: NPGlass(
                        padding: EdgeInsets.zero,
                        radius: 22,
                        child: Stack(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const NPPhoto(
                                  label: 'event.kairos.jpg',
                                  height: 150,
                                  hue: 320,
                                  borderRadius: BorderRadius.zero,
                                ),
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('KAIROS — opening night',
                                          style: NPTextStyles.heading(18, w: FontWeight.w600)),
                                      const SizedBox(height: 3),
                                      Text('Sat · 23:00 · 200 covers left',
                                          style: NPTextStyles.body(13, color: NPColors.textDim)),
                                      const SizedBox(height: 12),
                                      Row(
                                        children: [
                                          Text('\$450',
                                              style: NPTextStyles.body(11, color: NPColors.textFaint).copyWith(
                                                  decoration: TextDecoration.lineThrough)),
                                          const SizedBox(width: 8),
                                          Text('\$270',
                                              style: NPTextStyles.display(22, color: NPColors.magenta)),
                                          const Spacer(),
                                          Text('View →',
                                              style: NPTextStyles.heading(13, w: FontWeight.w600, color: NPColors.hero)),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const Positioned(
                              top: 12,
                              left: 12,
                              child: NPChip(tone: NPChipTone.magenta, child: Text('EXCLUSIVE · 40% OFF')),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  _section('Near you · 1.2 km'),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      children: _near
                          .map((b) => Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: GestureDetector(
                                  onTap: () => context.go('/bar'),
                                  child: NPGlass(
                                    padding: const EdgeInsets.all(10),
                                    radius: 16,
                                    child: Row(
                                      children: [
                                        SizedBox(
                                          width: 64,
                                          height: 64,
                                          child: NPPhoto(
                                            label: '',
                                            height: 64,
                                            hue: b['hue'] as double,
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(b['name'] as String,
                                                  style: NPTextStyles.heading(15, w: FontWeight.w600)),
                                              const SizedBox(height: 2),
                                              Text('Cover from \$120 · 0.8 km',
                                                  style: NPTextStyles.body(12, color: NPColors.textDim)),
                                              const SizedBox(height: 8),
                                              SizedBox(
                                                width: 110,
                                                child: NPCapacity(pct: b['cap'] as int, label: ''),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ))
                          .toList(),
                    ),
                  ),
                  const SizedBox(height: 24),
                  GestureDetector(
                    onTap: () => context.go('/stories'),
                    child: Center(
                      child: Text(
                        'Ver historias en vivo →',
                        style: NPTextStyles.heading(13, w: FontWeight.w600, color: NPColors.hero),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _section(String title, {String? action}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Expanded(child: Text(title, style: NPTextStyles.heading(15, w: FontWeight.w600))),
          if (action != null)
            Text(action, style: NPTextStyles.heading(12, w: FontWeight.w500, color: NPColors.hero)),
        ],
      ),
    );
  }
}
