import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_capacity.dart';
import '../widgets/np_glass.dart';
import '../widgets/np_photo.dart';
import '../widgets/np_tab_bar.dart';

class StoriesFeedScreen extends StatelessWidget {
  const StoriesFeedScreen({super.key});

  static const _ring = [
    {'name': 'Lumen', 'hue': 280.0, 'live': true},
    {'name': 'Velour', 'hue': 310.0, 'live': true},
    {'name': 'Obsidiana', 'hue': 260.0, 'live': true},
    {'name': 'Halo', 'hue': 295.0, 'live': false},
    {'name': 'Cinco Sur', 'hue': 320.0, 'live': true},
    {'name': 'Kioto', 'hue': 250.0, 'live': false},
  ];

  static const _liveGrid = [
    {'n': 'Lumen', 'cap': 72, 'hue': 280.0, 'watch': 142},
    {'n': 'Velour', 'cap': 38, 'hue': 310.0, 'watch': 88},
    {'n': 'Obsidiana', 'cap': 91, 'hue': 260.0, 'watch': 311},
    {'n': 'Cinco Sur', 'cap': 23, 'hue': 320.0, 'watch': 41},
  ];

  Color _hsl(double h, double s, double l) => HSLColor.fromAHSL(1, h % 360, s, l).toColor();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          SafeArea(
            bottom: false,
            child: ListView(
              padding: const EdgeInsets.only(top: 12, bottom: 110),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 14),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('LIVE NOW · CDMX', style: NPTextStyles.label(size: 12, spacing: 0.08)),
                            const SizedBox(height: 2),
                            Text("Tonight's pulse", style: NPTextStyles.display(26)),
                          ],
                        ),
                      ),
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.05),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                        ),
                        child: const Icon(Icons.tune, size: 16, color: NPColors.text),
                      ),
                    ],
                  ),
                ),
                SizedBox(
                  height: 130,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 18),
                    scrollDirection: Axis.horizontal,
                    itemCount: _ring.length + 1,
                    separatorBuilder: (_, __) => const SizedBox(width: 14),
                    itemBuilder: (_, i) {
                      if (i == 0) {
                        return _avatar('Your night', 290, false);
                      }
                      final s = _ring[i - 1];
                      return GestureDetector(
                        onTap: (s['live'] as bool) ? () => context.go('/story') : null,
                        child: _avatar(s['name'] as String, s['hue'] as double, s['live'] as bool),
                      );
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Friends out tonight',
                          style: NPTextStyles.heading(14, w: FontWeight.w600)),
                      Text('4 LIVE',
                          style: NPTextStyles.heading(12, w: FontWeight.w600, color: NPColors.hero)),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 22),
                  child: NPGlass(
                    padding: const EdgeInsets.all(12),
                    radius: 16,
                    child: Row(
                      children: [
                        SizedBox(
                          width: 36 + 3 * 26.0,
                          height: 36,
                          child: Stack(
                            clipBehavior: Clip.none,
                            children: List.generate(4, (i) {
                              final hues = [270.0, 290.0, 310.0, 260.0];
                              final initials = ['MR', 'JC', 'SO', 'DV'];
                              return Positioned(
                                left: i * 26.0,
                                child: Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient: LinearGradient(
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                      colors: [
                                        _hsl(hues[i], 0.6, 0.4),
                                        _hsl(hues[i] + 20, 0.65, 0.28),
                                      ],
                                    ),
                                    border: Border.all(color: NPColors.base, width: 2),
                                  ),
                                  child: Center(
                                    child: Text(initials[i],
                                        style: NPTextStyles.heading(11, w: FontWeight.w600)),
                                  ),
                                ),
                              );
                            }),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              RichText(
                                text: TextSpan(
                                  style: NPTextStyles.body(13),
                                  children: const [
                                    TextSpan(text: 'Maya', style: TextStyle(fontWeight: FontWeight.w600)),
                                    TextSpan(text: ', '),
                                    TextSpan(text: 'Julián', style: TextStyle(fontWeight: FontWeight.w600)),
                                    TextSpan(text: ' + 2 more'),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text('at Velour, Lumen, Cinco Sur',
                                  style: NPTextStyles.body(11, color: NPColors.textDim)),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: NPColors.hero),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                  child: Text('Live at venues', style: NPTextStyles.heading(14, w: FontWeight.w600)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      childAspectRatio: 0.78,
                    ),
                    itemCount: _liveGrid.length,
                    itemBuilder: (_, i) {
                      final v = _liveGrid[i];
                      return GestureDetector(
                        onTap: () => context.go('/story'),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Stack(
                            children: [
                              Positioned.fill(
                                child: NPPhoto(
                                  label: '',
                                  height: null,
                                  hue: v['hue'] as double,
                                  borderRadius: BorderRadius.zero,
                                ),
                              ),
                              Positioned.fill(
                                child: DecoratedBox(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      begin: Alignment.topCenter,
                                      end: Alignment.bottomCenter,
                                      colors: [
                                        Colors.black.withValues(alpha: 0.1),
                                        Colors.transparent,
                                        Colors.black.withValues(alpha: 0.85),
                                      ],
                                      stops: const [0, 0.4, 1],
                                    ),
                                  ),
                                ),
                              ),
                              Positioned(
                                top: 8,
                                left: 8,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: NPColors.success,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text('● LIVE',
                                      style: NPTextStyles.heading(9, w: FontWeight.w700,
                                          color: const Color(0xFF062C12)).copyWith(letterSpacing: 0.7)),
                                ),
                              ),
                              Positioned(
                                top: 8,
                                right: 8,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.55),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text('👁 ${v['watch']}',
                                      style: NPTextStyles.heading(10, w: FontWeight.w500,
                                          color: Colors.white)),
                                ),
                              ),
                              Positioned(
                                left: 10,
                                right: 10,
                                bottom: 10,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(v['n'] as String,
                                        style: NPTextStyles.heading(14, w: FontWeight.w600,
                                            color: Colors.white)),
                                    const SizedBox(height: 6),
                                    NPCapacity(pct: v['cap'] as int, label: ''),
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
              ],
            ),
          ),
          const NPTabBar(active: NPTab.home),
        ],
      ),
    );
  }

  Widget _avatar(String name, double hue, bool live) {
    const size = 64.0;
    return SizedBox(
      width: size + 12,
      child: Column(
        children: [
          SizedBox(
            width: size + 8,
            height: size + 8,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: live
                        ? const SweepGradient(
                            colors: [NPColors.hero, NPColors.magenta, NPColors.cyan, NPColors.hero],
                            startAngle: 2.4,
                            endAngle: 8.7,
                          )
                        : null,
                    color: live ? null : Colors.white.withValues(alpha: 0.12),
                    boxShadow: live
                        ? [
                            BoxShadow(
                              color: NPColors.hero.withValues(alpha: 0.6),
                              blurRadius: 18,
                              spreadRadius: -2,
                            ),
                          ]
                        : null,
                  ),
                  padding: const EdgeInsets.all(2.5),
                  child: Container(
                    decoration: const BoxDecoration(shape: BoxShape.circle, color: NPColors.base),
                    padding: const EdgeInsets.all(2),
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            _hsl(hue, 0.45, 0.28),
                            _hsl(hue + 30, 0.6, 0.12),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                if (live)
                  Positioned(
                    bottom: -2,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: NPColors.success,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: NPColors.base, width: 1.5),
                        ),
                        child: Text('LIVE',
                            style: NPTextStyles.heading(8, w: FontWeight.w700,
                                color: const Color(0xFF062C12)).copyWith(letterSpacing: 0.8)),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Text(
            name,
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
            style: NPTextStyles.heading(11, w: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}
