import 'package:flutter/material.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_chip.dart';
import '../widgets/np_glass.dart';
import '../widgets/np_photo.dart';

class SearchScreen extends StatelessWidget {
  const SearchScreen({super.key});

  static const _filters = [
    {'label': 'Rooftop', 'on': true},
    {'label': 'Cocktails', 'on': true},
    {'label': 'Live music', 'on': false},
    {'label': 'Open late', 'on': true},
    {'label': 'Dance floor', 'on': false},
    {'label': 'Speakeasy', 'on': false},
  ];

  static const _distance = ['<1km', '1–3km', '3–5km', 'Anywhere'];

  static const _results = [
    {'name': 'Lumen', 'tag': 'Rooftop · Roma Norte · 0.4 km', 'cap': 72, 'hue': 280.0},
    {'name': 'Velour', 'tag': 'Cocktails · Condesa · 1.1 km', 'cap': 38, 'hue': 310.0},
    {'name': 'Cinco Sur', 'tag': 'Rooftop · Juárez · 1.6 km', 'cap': 23, 'hue': 260.0},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          SafeArea(
            bottom: false,
            child: ListView(
              padding: const EdgeInsets.only(top: 6, bottom: 110),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                  child: NPGlass(
                    radius: 14,
                    borderColor: NPColors.hero2,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    child: Row(
                      children: [
                        const Icon(Icons.search_rounded, size: 18, color: NPColors.hero),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text('rooftop in roma',
                              style: NPTextStyles.body(15)),
                        ),
                        Icon(Icons.close_rounded, size: 14, color: NPColors.textDim),
                      ],
                    ),
                  ),
                ),
                _label('VIBE'),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _filters.map((f) {
                      final on = f['on'] as bool;
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: on ? NPColors.hero.withValues(alpha: 0.18) : Colors.white.withValues(alpha: 0.03),
                          border: Border.all(
                              color: on ? NPColors.hero : Colors.white.withValues(alpha: 0.10)),
                          borderRadius: BorderRadius.circular(999),
                          boxShadow: on
                              ? [
                                  BoxShadow(
                                      color: NPColors.hero.withValues(alpha: 0.5),
                                      blurRadius: 18,
                                      spreadRadius: -4),
                                ]
                              : null,
                        ),
                        child: Text(
                          f['label'] as String,
                          style: NPTextStyles.heading(13, w: FontWeight.w500,
                              color: on ? NPColors.heroSoft : NPColors.text),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                _label('COVER'),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
                  child: NPGlass(
                    radius: 16,
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('\$80', style: NPTextStyles.heading(13)),
                            Text('—', style: NPTextStyles.heading(13, color: NPColors.textDim)),
                            Text('\$400', style: NPTextStyles.heading(13)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          height: 16,
                          child: LayoutBuilder(builder: (_, c) {
                            return Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Positioned(
                                  top: 6,
                                  left: 0,
                                  right: 0,
                                  child: Container(
                                    height: 4,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                  ),
                                ),
                                Positioned(
                                  top: 6,
                                  left: c.maxWidth * 0.15,
                                  width: c.maxWidth * 0.47,
                                  child: Container(
                                    height: 4,
                                    decoration: BoxDecoration(
                                      color: NPColors.hero,
                                      borderRadius: BorderRadius.circular(999),
                                      boxShadow: [BoxShadow(color: NPColors.hero, blurRadius: 12)],
                                    ),
                                  ),
                                ),
                                Positioned(
                                  top: 0,
                                  left: c.maxWidth * 0.13,
                                  child: _knob(),
                                ),
                                Positioned(
                                  top: 0,
                                  left: c.maxWidth * 0.60,
                                  child: _knob(),
                                ),
                              ],
                            );
                          }),
                        ),
                      ],
                    ),
                  ),
                ),
                _label('DISTANCE'),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 22),
                  child: NPGlass(
                    padding: const EdgeInsets.all(8),
                    radius: 16,
                    child: Row(
                      children: List.generate(_distance.length, (i) {
                        final on = i == 1;
                        return Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            margin: const EdgeInsets.symmetric(horizontal: 2),
                            decoration: BoxDecoration(
                              color: on ? NPColors.hero.withValues(alpha: 0.18) : Colors.transparent,
                              border: Border.all(
                                  color: on ? NPColors.hero : Colors.transparent),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Center(
                              child: Text(
                                _distance[i],
                                style: NPTextStyles.heading(12, w: FontWeight.w500,
                                    color: on ? NPColors.heroSoft : NPColors.textDim),
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                  child: Row(
                    children: [
                      Expanded(child: Text('23 RESULTS', style: NPTextStyles.label(spacing: 0.1))),
                      Text('Sort: Trending ↓',
                          style: NPTextStyles.heading(12, w: FontWeight.w600, color: NPColors.hero)),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    children: _results
                        .map((r) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: NPGlass(
                                padding: const EdgeInsets.all(10),
                                radius: 14,
                                child: Row(
                                  children: [
                                    SizedBox(
                                      width: 56,
                                      height: 56,
                                      child: NPPhoto(
                                        label: '',
                                        height: 56,
                                        hue: r['hue'] as double,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(r['name'] as String,
                                              style: NPTextStyles.heading(14, w: FontWeight.w600)),
                                          const SizedBox(height: 2),
                                          Text(r['tag'] as String,
                                              style: NPTextStyles.body(11, color: NPColors.textDim)),
                                        ],
                                      ),
                                    ),
                                    NPChip(
                                      tone: (r['cap'] as int) > 85 ? NPChipTone.magenta : NPChipTone.live,
                                      fontSize: 10,
                                      child: Text('${r['cap']}%'),
                                    ),
                                  ],
                                ),
                              ),
                            ))
                        .toList(),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                  child: NPPrimary(full: true, child: const Text('Apply filters · 23 venues')),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
        child: Text(text, style: NPTextStyles.label(spacing: 0.1)),
      );

  Widget _knob() => Container(
        width: 16,
        height: 16,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          border: Border.all(color: NPColors.hero, width: 3),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 8, offset: const Offset(0, 2))],
        ),
      );
}
