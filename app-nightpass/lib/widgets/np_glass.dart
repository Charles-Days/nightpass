import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/np_theme.dart';

/// Tarjeta translucida del sistema NightPass.
///
/// Por defecto **no usa `BackdropFilter`** — pinta una caja semitransparente con
/// borde, lo cual es visualmente casi idéntico cuando el fondo detrás es estático
/// (gradientes de [NPBackdrop]) pero ~10x más barato.
///
/// Habilita `blur: true` solo cuando la tarjeta flota sobre contenido dinámico
/// (ej. la tab bar sobre listas en scroll) o cuando el efecto frosted-glass
/// realmente aporta visualmente.
class NPGlass extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final bool glow;
  final Color? borderColor;
  final double borderWidth;
  final bool blur;

  const NPGlass({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = 18,
    this.glow = false,
    this.borderColor,
    this.borderWidth = 1,
    this.blur = false,
  });

  @override
  Widget build(BuildContext context) {
    final box = Container(
      decoration: BoxDecoration(
        color: NPColors.glassBg,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: borderColor ?? NPColors.glassBorder,
          width: borderWidth,
        ),
        boxShadow: glow
            ? [
                BoxShadow(
                  color: NPColors.hero.withValues(alpha: 0.45),
                  offset: const Offset(0, 12),
                  blurRadius: 40,
                  spreadRadius: -8,
                ),
              ]
            : null,
      ),
      child: Padding(padding: padding, child: child),
    );

    if (!blur) return box;

    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: box,
      ),
    );
  }
}
