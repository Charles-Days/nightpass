import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/np_theme.dart';

enum NPTab { home, search, ticket, user }

class NPTabBar extends StatelessWidget {
  final NPTab active;
  final ValueChanged<NPTab>? onTap;

  const NPTabBar({super.key, required this.active, this.onTap});

  void _go(BuildContext context, NPTab tab) {
    if (onTap != null) {
      onTap!(tab);
      return;
    }
    switch (tab) {
      case NPTab.home:
        context.go('/home');
        break;
      case NPTab.search:
        context.go('/search');
        break;
      case NPTab.ticket:
        context.go('/pass');
        break;
      case NPTab.user:
        context.go('/profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = [
      _Item(NPTab.home, 'Discover', Icons.home_outlined),
      _Item(NPTab.search, 'Search', Icons.search_rounded),
      _Item(NPTab.ticket, 'My Pass', Icons.confirmation_number_outlined),
      _Item(NPTab.user, 'Profile', Icons.person_outline),
    ];

    return Positioned(
      bottom: 24,
      left: 16,
      right: 16,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 28, sigmaY: 28),
          child: Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: const Color(0xFF140C20).withValues(alpha: 0.72),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.6), blurRadius: 40, offset: const Offset(0, 14)),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: items.map((it) {
                final on = it.tab == active;
                return Expanded(
                  child: InkWell(
                    onTap: () => _go(context, it.tab),
                    borderRadius: BorderRadius.circular(16),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(it.icon, size: 22, color: on ? NPColors.hero : NPColors.text.withValues(alpha: 0.6)),
                        const SizedBox(height: 3),
                        Text(
                          it.label,
                          style: NPTextStyles.heading(10, w: on ? FontWeight.w600 : FontWeight.w500,
                              color: on ? NPColors.hero : NPColors.text.withValues(alpha: 0.55)),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
    );
  }
}

class _Item {
  final NPTab tab;
  final String label;
  final IconData icon;
  const _Item(this.tab, this.label, this.icon);
}
