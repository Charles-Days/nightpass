import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_glass.dart';
import '../widgets/np_photo.dart';

class FriendsInviteScreen extends StatefulWidget {
  const FriendsInviteScreen({super.key});

  @override
  State<FriendsInviteScreen> createState() => _FriendsInviteScreenState();
}

class _FriendsInviteScreenState extends State<FriendsInviteScreen> {
  int _payOption = 1;

  static const _friends = [
    {'i': 'MR', 'n': 'Maya Rivera', 's': '@maya · Live at Velour', 'hue': 270.0, 'live': true},
    {'i': 'JC', 'n': 'Julián Cano', 's': '@jcano · Heading to Lumen 23:00', 'hue': 290.0, 'live': false},
    {'i': 'SO', 'n': 'Sofia Ortega', 's': '@sof.ort · Out tonight', 'hue': 310.0, 'live': true},
    {'i': 'DV', 'n': 'Diego Vargas', 's': '@diev · Tagged you in a story', 'hue': 260.0, 'live': false},
    {'i': 'LP', 'n': 'Lucía Paredes', 's': '@lupar · Last seen 2d ago', 'hue': 240.0, 'live': false},
  ];

  static const _payOptions = [
    {'k': 'split', 't': 'Split evenly', 'd': '\$230 each · 3 people'},
    {'k': 'me', 't': "I'm covering them", 'd': 'You pay \$690 for all 3'},
    {'k': 'each', 't': 'Each pays their own', 'd': 'They get a payment link'},
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
              padding: const EdgeInsets.only(top: 10, bottom: 130),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () => context.canPop() ? context.pop() : context.go('/profile'),
                        child: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: NPColors.text),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Invite the crew', style: NPTextStyles.display(22)),
                            const SizedBox(height: 2),
                            Text('KAIROS · Lumen · Sat 23:00',
                                style: NPTextStyles.body(12, color: NPColors.textDim)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
                  child: NPGlass(
                    padding: const EdgeInsets.all(12),
                    radius: 16,
                    child: Row(
                      children: [
                        SizedBox(
                          width: 52,
                          height: 52,
                          child: NPPhoto(
                            label: '',
                            height: 52,
                            hue: 320,
                            borderRadius: BorderRadius.circular(12),
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
                              Text('VIP Lounge · \$690 / pass',
                                  style: NPTextStyles.body(12, color: NPColors.textDim)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                  child: NPGlass(
                    radius: 14,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                    child: Row(
                      children: [
                        Icon(Icons.search_rounded, size: 16, color: NPColors.textDim),
                        const SizedBox(width: 10),
                        Text('Search friends', style: NPTextStyles.body(14, color: NPColors.textDim)),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                  child: Text('INVITING · 2', style: NPTextStyles.label(spacing: 0.1)),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _selectedPill('MR', 'Maya', 270),
                      _selectedPill('JC', 'Julián', 290),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                  child: Text('OUT TONIGHT', style: NPTextStyles.label(spacing: 0.1)),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
                  child: Column(
                    children: List.generate(_friends.length, (idx) {
                      final f = _friends[idx];
                      final selected = idx < 2;
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                        decoration: BoxDecoration(
                          color: selected ? NPColors.hero.withValues(alpha: 0.06) : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Container(
                                  width: 42,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient: LinearGradient(
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                      colors: [
                                        _hsl(f['hue'] as double, 0.6, 0.4),
                                        _hsl((f['hue'] as double) + 20, 0.65, 0.28),
                                      ],
                                    ),
                                  ),
                                  child: Center(
                                    child: Text(f['i'] as String,
                                        style: NPTextStyles.heading(13, w: FontWeight.w600)),
                                  ),
                                ),
                                if (f['live'] as bool)
                                  Positioned(
                                    bottom: -2,
                                    right: -2,
                                    child: Container(
                                      width: 12,
                                      height: 12,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: NPColors.success,
                                        border: Border.all(color: NPColors.base, width: 2),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(f['n'] as String,
                                      style: NPTextStyles.heading(14, w: FontWeight.w500)),
                                  const SizedBox(height: 2),
                                  Text(f['s'] as String,
                                      style: NPTextStyles.body(11,
                                          color: f['live'] as bool ? NPColors.successText : NPColors.textDim)),
                                ],
                              ),
                            ),
                            Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                color: selected ? NPColors.hero : Colors.transparent,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                    color: selected ? NPColors.hero : Colors.white.withValues(alpha: 0.18),
                                    width: 1.5),
                                boxShadow: selected
                                    ? [BoxShadow(color: NPColors.hero.withValues(alpha: 0.6), blurRadius: 12)]
                                    : null,
                              ),
                              child: selected
                                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                                  : null,
                            ),
                          ],
                        ),
                      );
                    }),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                  child: Text("WHO'S PAYING", style: NPTextStyles.label(spacing: 0.1)),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: Column(
                    children: List.generate(_payOptions.length, (i) {
                      final o = _payOptions[i];
                      final on = _payOption == i;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: GestureDetector(
                          onTap: () => setState(() => _payOption = i),
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: on ? NPColors.hero.withValues(alpha: 0.10) : Colors.white.withValues(alpha: 0.03),
                              border: Border.all(
                                  color: on ? NPColors.hero : Colors.white.withValues(alpha: 0.08)),
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: on
                                  ? [
                                      BoxShadow(
                                        color: NPColors.hero.withValues(alpha: 0.5),
                                        blurRadius: 24,
                                        spreadRadius: -6,
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 18,
                                  height: 18,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: on ? NPColors.hero : Colors.transparent,
                                    border: Border.all(
                                        color: on ? NPColors.hero : Colors.white.withValues(alpha: 0.25),
                                        width: 1.5),
                                  ),
                                  child: on
                                      ? const Center(
                                          child: SizedBox(
                                            width: 6,
                                            height: 6,
                                            child: DecoratedBox(
                                              decoration: BoxDecoration(
                                                color: Colors.white,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                          ),
                                        )
                                      : null,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(o['t']!,
                                          style: NPTextStyles.heading(14, w: FontWeight.w600)),
                                      const SizedBox(height: 2),
                                      Text(o['d']!,
                                          style: NPTextStyles.body(12, color: NPColors.textDim)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                  child: Text('NOTE', style: NPTextStyles.label(spacing: 0.1)),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                  child: NPGlass(
                    radius: 14,
                    padding: const EdgeInsets.all(14),
                    child: Text(
                      'Yo va por mi cuenta esta noche, los espero en la puerta a las 23:15 ✨',
                      style: NPTextStyles.body(14, height: 1.45),
                    ),
                  ),
                ),
              ],
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
                onPressed: () => context.go('/pass'),
                child: const Text('Send invites & pay \$690'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _selectedPill(String i, String name, double hue) {
    return Container(
      padding: const EdgeInsets.fromLTRB(5, 5, 12, 5),
      decoration: BoxDecoration(
        color: NPColors.hero.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: NPColors.hero),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  _hsl(hue, 0.6, 0.4),
                  _hsl(hue + 20, 0.65, 0.28),
                ],
              ),
            ),
            child: Center(
              child: Text(i, style: NPTextStyles.heading(9, w: FontWeight.w600, color: Colors.white)),
            ),
          ),
          const SizedBox(width: 8),
          Text(name, style: NPTextStyles.heading(12, w: FontWeight.w500, color: NPColors.heroSoft)),
          const SizedBox(width: 6),
          const Icon(Icons.close_rounded, size: 11, color: NPColors.heroSoft),
        ],
      ),
    );
  }
}
