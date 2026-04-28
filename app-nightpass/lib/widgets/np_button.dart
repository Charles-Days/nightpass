import 'package:flutter/material.dart';
import '../theme/np_theme.dart';

class NPPrimary extends StatelessWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final bool full;
  final bool glow;
  final EdgeInsets padding;
  final double radius;

  const NPPrimary({
    super.key,
    required this.child,
    this.onPressed,
    this.full = false,
    this.glow = true,
    this.padding = const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
    this.radius = 12,
  });

  @override
  Widget build(BuildContext context) {
    final btn = DecoratedBox(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [NPColors.hero, NPColors.hero2],
        ),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08), width: 1),
        boxShadow: glow
            ? [
                BoxShadow(
                  color: NPColors.hero.withValues(alpha: 0.7),
                  offset: const Offset(0, 8),
                  blurRadius: 28,
                  spreadRadius: -6,
                ),
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.4),
                  offset: const Offset(0, 2),
                  blurRadius: 6,
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed ?? () {},
          borderRadius: BorderRadius.circular(radius),
          child: Padding(
            padding: padding,
            child: Center(
              child: DefaultTextStyle.merge(
                style: NPTextStyles.heading(16, w: FontWeight.w600),
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
    return full ? SizedBox(width: double.infinity, child: btn) : btn;
  }
}

class NPGhost extends StatelessWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final bool full;
  final EdgeInsets padding;
  final double radius;

  const NPGhost({
    super.key,
    required this.child,
    this.onPressed,
    this.full = false,
    this.padding = const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
    this.radius = 12,
  });

  @override
  Widget build(BuildContext context) {
    final btn = DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: Colors.white.withValues(alpha: 0.10), width: 1),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed ?? () {},
          borderRadius: BorderRadius.circular(radius),
          child: Padding(
            padding: padding,
            child: Center(
              child: DefaultTextStyle.merge(
                style: NPTextStyles.heading(15, w: FontWeight.w500),
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
    return full ? SizedBox(width: double.infinity, child: btn) : btn;
  }
}
