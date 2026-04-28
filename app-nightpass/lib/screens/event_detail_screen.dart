import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_chip.dart';
import '../widgets/np_glass.dart';
import '../widgets/np_photo.dart';

class EventDetailScreen extends StatefulWidget {
  const EventDetailScreen({super.key});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  int _selected = 1;

  static const _tiers = [
    {'name': 'General', 'desc': 'Standard cover · Open bar 22–23h', 'price': 270, 'left': 184, 'badge': null},
    {'name': 'VIP Lounge', 'desc': 'Reserved area · Premium open bar · Skip line', 'price': 690, 'left': 22, 'badge': 'POPULAR'},
    {'name': 'Penthouse', 'desc': 'Private terrace · Bottle service · 4 ppl', 'price': 4800, 'left': 3, 'badge': null},
  ];

  @override
  Widget build(BuildContext context) {
    final price = _tiers[_selected]['price'] as int;
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
                    height: 260,
                    child: Stack(
                      children: [
                        const NPPhoto(
                          label: 'kairos.hero.jpg',
                          height: 260,
                          hue: 320,
                          borderRadius: BorderRadius.zero,
                        ),
                        Positioned.fill(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.black.withValues(alpha: 0.45),
                                  Colors.transparent,
                                  NPColors.base,
                                ],
                                stops: const [0, 0.35, 1],
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 56,
                          left: 16,
                          child: GestureDetector(
                            onTap: () => context.canPop() ? context.pop() : context.go('/bar'),
                            child: ClipOval(
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
                                  child: const Center(
                                    child: Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: NPColors.text),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const Positioned(
                          top: 56,
                          right: 16,
                          child: NPChip(tone: NPChipTone.magenta, child: Text('EXCLUSIVE · 40% OFF')),
                        ),
                      ],
                    ),
                  ),
                  Transform.translate(
                    offset: const Offset(0, -50),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'AT LUMEN · ROMA NORTE',
                            style: NPTextStyles.heading(12, w: FontWeight.w600, color: NPColors.hero)
                                .copyWith(letterSpacing: 1.5),
                          ),
                          const SizedBox(height: 6),
                          Text('KAIROS\nopening night',
                              style: NPTextStyles.display(30).copyWith(height: 1.05)),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              Expanded(
                                child: NPGlass(
                                  padding: const EdgeInsets.all(12),
                                  radius: 14,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('WHEN', style: NPTextStyles.label(size: 10, spacing: 0.1)),
                                      const SizedBox(height: 4),
                                      Text('Sat · 26 Apr',
                                          style: NPTextStyles.heading(14, w: FontWeight.w600)),
                                      Text('23:00 — 04:00',
                                          style: NPTextStyles.body(12, color: NPColors.textDim)),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: NPGlass(
                                  padding: const EdgeInsets.all(12),
                                  radius: 14,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('LINEUP', style: NPTextStyles.label(size: 10, spacing: 0.1)),
                                      const SizedBox(height: 4),
                                      Text('Mara Linn',
                                          style: NPTextStyles.heading(14, w: FontWeight.w600)),
                                      Text('+ 2 residents',
                                          style: NPTextStyles.body(12, color: NPColors.textDim)),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 22),
                          Text('Choose your pass',
                              style: NPTextStyles.heading(14, w: FontWeight.w600)),
                          const SizedBox(height: 10),
                          ...List.generate(_tiers.length, (i) {
                            final t = _tiers[i];
                            final on = _selected == i;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: GestureDetector(
                                onTap: () => setState(() => _selected = i),
                                child: Stack(
                                  clipBehavior: Clip.none,
                                  children: [
                                    NPGlass(
                                      padding: const EdgeInsets.all(14),
                                      radius: 16,
                                      glow: on,
                                      borderColor: on ? NPColors.hero : null,
                                      borderWidth: on ? 1.5 : 1,
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  children: [
                                                    _radio(on),
                                                    const SizedBox(width: 8),
                                                    Text(t['name'] as String,
                                                        style: NPTextStyles.heading(16, w: FontWeight.w600)),
                                                  ],
                                                ),
                                                const SizedBox(height: 6),
                                                Padding(
                                                  padding: const EdgeInsets.only(left: 26),
                                                  child: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    children: [
                                                      Text(t['desc'] as String,
                                                          style: NPTextStyles.body(12,
                                                              color: NPColors.textDim, height: 1.45)),
                                                      const SizedBox(height: 8),
                                                      Text(
                                                        '${t['left']} LEFT',
                                                        style: NPTextStyles.label(
                                                          size: 11,
                                                          spacing: 0.04,
                                                          color: (t['left'] as int) < 10
                                                              ? NPColors.magenta
                                                              : NPColors.textFaint,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Text('\$${t['price']}',
                                              style: NPTextStyles.display(18)),
                                        ],
                                      ),
                                    ),
                                    if (t['badge'] != null)
                                      Positioned(
                                        top: -8,
                                        right: 14,
                                        child: NPChip(
                                          tone: NPChipTone.magenta,
                                          fontSize: 9,
                                          child: Text(t['badge'] as String),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          }),
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
              child: NPPrimary(
                full: true,
                onPressed: () => context.go('/checkout'),
                child: Text('Continue · \$$price'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _radio(bool on) {
    return Container(
      width: 18,
      height: 18,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: on ? NPColors.hero : Colors.transparent,
        border: Border.all(color: on ? NPColors.hero : Colors.white.withValues(alpha: 0.25), width: 1.5),
        boxShadow: on ? [BoxShadow(color: NPColors.hero, blurRadius: 12)] : null,
      ),
      child: on
          ? const Center(
              child: SizedBox(
                width: 6,
                height: 6,
                child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
              ),
            )
          : null,
    );
  }
}
