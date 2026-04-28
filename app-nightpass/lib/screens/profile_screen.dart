import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../state/auth_controller.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_chip.dart';
import '../widgets/np_glass.dart';
import '../widgets/np_photo.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  static const _stats = [
    {'k': 'Nights', 'v': '47'},
    {'k': 'Venues', 'v': '23'},
    {'k': 'Saved', 'v': '12'},
  ];

  static const _friends = [
    {'i': 'MR', 'h': 270.0, 'live': true},
    {'i': 'JC', 'h': 290.0, 'live': false},
    {'i': 'SO', 'h': 310.0, 'live': true},
    {'i': 'DV', 'h': 260.0, 'live': false},
    {'i': 'LP', 'h': 240.0, 'live': false},
  ];

  static const _saved = [
    {'n': 'Lumen', 'h': 280.0},
    {'n': 'Velour', 'h': 310.0},
    {'n': 'Halo', 'h': 295.0},
  ];

  static const _history = [
    {'n': 'Velour', 'd': 'Apr 19 · Cocktail bar', 'amt': '\$220'},
    {'n': 'Obsidiana', 'd': 'Apr 12 · Underground set', 'amt': '\$340'},
    {'n': 'Halo', 'd': 'Apr 5 · Rooftop · w/ Maya', 'amt': '\$180'},
  ];

  Color _hsl(double h, double s, double l) => HSLColor.fromAHSL(1, h % 360, s, l).toColor();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          SafeArea(
            bottom: false,
            child: ListView(
              padding: const EdgeInsets.only(top: 8, bottom: 110),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
                  child: Row(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [NPColors.hero, NPColors.magenta],
                          ),
                          boxShadow: [BoxShadow(color: NPColors.hero.withValues(alpha: 0.5), blurRadius: 28)],
                        ),
                        child: Center(
                          child: Text(
                            _initials(user?.name ?? user?.email),
                            style: NPTextStyles.display(22),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user?.name ?? 'Guest', style: NPTextStyles.display(20)),
                            const SizedBox(height: 2),
                            Text(
                              user?.email ?? 'Member · CDMX',
                              style: NPTextStyles.body(12, color: NPColors.textDim),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 8),
                            const NPChip(tone: NPChipTone.hero, child: Text('INSIDER · TIER II')),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
                  child: Row(
                    children: _stats
                        .map((s) => Expanded(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                child: NPGlass(
                                  padding: const EdgeInsets.all(12),
                                  radius: 14,
                                  child: Column(
                                    children: [
                                      Text(s['v']!, style: NPTextStyles.display(22)),
                                      const SizedBox(height: 2),
                                      Text(s['k']!.toUpperCase(),
                                          style: NPTextStyles.label(size: 10, spacing: 0.1)),
                                    ],
                                  ),
                                ),
                              ),
                            ))
                        .toList(),
                  ),
                ),
                _sectionHeader('Upcoming', '2'),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 22),
                  child: GestureDetector(
                    onTap: () => context.go('/pass'),
                    child: NPGlass(
                      padding: const EdgeInsets.all(12),
                      radius: 16,
                      borderColor: NPColors.hero,
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 56,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [NPColors.hero, NPColors.magenta],
                              ),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text('SAT',
                                    style: NPTextStyles.heading(9, w: FontWeight.w700,
                                            color: Colors.white.withValues(alpha: 0.85))
                                        .copyWith(letterSpacing: 1.0)),
                                Text('26',
                                    style: NPTextStyles.display(18, color: Colors.white)
                                        .copyWith(height: 1)),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('KAIROS · VIP',
                                    style: NPTextStyles.heading(14, w: FontWeight.w600)),
                                const SizedBox(height: 2),
                                Text('Lumen · 23:00',
                                    style: NPTextStyles.body(12, color: NPColors.textDim)),
                              ],
                            ),
                          ),
                          const Icon(Icons.qr_code_2, size: 20, color: NPColors.hero),
                        ],
                      ),
                    ),
                  ),
                ),
                _sectionHeader('Crew · 12 friends', 'Invite', onAction: () => context.go('/friends')),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 22),
                  child: NPGlass(
                    padding: const EdgeInsets.all(12),
                    radius: 16,
                    child: Row(
                      children: [
                        SizedBox(
                          width: 38 + (_friends.length - 1) * 30.0,
                          height: 38,
                          child: Stack(
                            clipBehavior: Clip.none,
                            children: List.generate(_friends.length, (i) {
                              final f = _friends[i];
                              return Positioned(
                                left: i * 30.0,
                                child: Stack(
                                  children: [
                                    Container(
                                      width: 38,
                                      height: 38,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        gradient: LinearGradient(
                                          begin: Alignment.topLeft,
                                          end: Alignment.bottomRight,
                                          colors: [
                                            _hsl(f['h'] as double, 0.6, 0.4),
                                            _hsl((f['h'] as double) + 20, 0.65, 0.28),
                                          ],
                                        ),
                                        border: Border.all(color: NPColors.base, width: 2),
                                      ),
                                      child: Center(
                                        child: Text(f['i'] as String,
                                            style: NPTextStyles.heading(11, w: FontWeight.w600)),
                                      ),
                                    ),
                                    if (f['live'] as bool)
                                      Positioned(
                                        bottom: 0,
                                        right: 0,
                                        child: Container(
                                          width: 10,
                                          height: 10,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: NPColors.success,
                                            border: Border.all(color: NPColors.base, width: 2),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              );
                            }),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('2 live now',
                                  style: NPTextStyles.heading(13, w: FontWeight.w500)),
                              const SizedBox(height: 2),
                              Text('Maya · Sofia at Velour',
                                  style: NPTextStyles.body(11, color: NPColors.textDim)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: NPColors.hero.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: NPColors.hero),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.add, size: 12, color: NPColors.heroSoft),
                              const SizedBox(width: 6),
                              Text('Invite',
                                  style: NPTextStyles.heading(12, w: FontWeight.w600, color: NPColors.heroSoft)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                _sectionHeader('Saved venues', 'See all'),
                SizedBox(
                  height: 175,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    scrollDirection: Axis.horizontal,
                    itemCount: _saved.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 10),
                    itemBuilder: (_, i) {
                      final v = _saved[i];
                      return SizedBox(
                        width: 110,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            NPPhoto(label: '', height: 130, hue: v['h'] as double),
                            const SizedBox(height: 8),
                            Text(v['n'] as String,
                                style: NPTextStyles.heading(13, w: FontWeight.w600)),
                            Text('Visited 4×', style: NPTextStyles.body(11, color: NPColors.textDim)),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 22),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                  child: Text('Recent nights', style: NPTextStyles.heading(14, w: FontWeight.w600)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    children: _history
                        .map((h) => Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                border: Border(bottom: BorderSide(color: NPColors.hairline)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.05),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: NPColors.hairline),
                                    ),
                                    child: const Icon(Icons.confirmation_number_outlined,
                                        size: 16, color: NPColors.hero),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(h['n']!,
                                            style: NPTextStyles.heading(14, w: FontWeight.w500)),
                                        const SizedBox(height: 1),
                                        Text(h['d']!,
                                            style: NPTextStyles.body(11, color: NPColors.textDim)),
                                      ],
                                    ),
                                  ),
                                  Text(h['amt']!,
                                      style: NPTextStyles.heading(13, color: NPColors.textDim)),
                                ],
                              ),
                            ))
                        .toList(),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 8),
                  child: GestureDetector(
                    onTap: () => _confirmLogout(context, ref),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: NPColors.magenta.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: NPColors.magenta.withValues(alpha: 0.55)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.logout_rounded,
                              size: 18, color: NPColors.magenta),
                          const SizedBox(width: 10),
                          Text(
                            'Cerrar sesión',
                            style: NPTextStyles.heading(15,
                                w: FontWeight.w600, color: NPColors.magenta),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _initials(String? source) {
    if (source == null || source.isEmpty) return 'NP';
    final parts = source.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    final first = parts[0];
    return first.length >= 2
        ? first.substring(0, 2).toUpperCase()
        : first[0].toUpperCase();
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.55),
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        elevation: 0,
        insetPadding: const EdgeInsets.symmetric(horizontal: 32),
        child: NPGlass(
          blur: true,
          radius: 20,
          padding: const EdgeInsets.fromLTRB(22, 22, 22, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                '¿Cerrar sesión?',
                style: NPTextStyles.display(20),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Tendrás que volver a iniciar sesión para entrar a NightPass.',
                style: NPTextStyles.body(13, color: NPColors.textDim),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  Expanded(
                    child: NPGhost(
                      onPressed: () => Navigator.of(ctx).pop(false),
                      child: const Text('Cancelar'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => Navigator.of(ctx).pop(true),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: NPColors.magenta.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: NPColors.magenta),
                        ),
                        child: Center(
                          child: Text(
                            'Cerrar sesión',
                            style: NPTextStyles.heading(14,
                                w: FontWeight.w600, color: NPColors.magenta),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    if (confirmed == true) {
      await ref.read(authProvider.notifier).signout();
    }
  }

  Widget _sectionHeader(String title, String action, {VoidCallback? onAction}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: NPTextStyles.heading(14, w: FontWeight.w600)),
          GestureDetector(
            onTap: onAction,
            child: Text(action,
                style: NPTextStyles.heading(12, w: FontWeight.w600, color: NPColors.hero)),
          ),
        ],
      ),
    );
  }
}
