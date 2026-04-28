import 'package:flutter/material.dart';
import '../theme/np_theme.dart';

enum NPChipTone { defaultTone, hero, magenta, cyan, live }

class NPChip extends StatelessWidget {
  final Widget child;
  final NPChipTone tone;
  final EdgeInsets padding;
  final double fontSize;

  const NPChip({
    super.key,
    required this.child,
    this.tone = NPChipTone.defaultTone,
    this.padding = const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    this.fontSize = 11,
  });

  @override
  Widget build(BuildContext context) {
    late Color bg, fg, bd;
    switch (tone) {
      case NPChipTone.hero:
        bg = NPColors.hero.withValues(alpha: 0.18);
        fg = NPColors.heroSoft;
        bd = NPColors.hero.withValues(alpha: 0.4);
        break;
      case NPChipTone.magenta:
        bg = NPColors.magenta.withValues(alpha: 0.15);
        fg = NPColors.magentaSoft;
        bd = NPColors.magenta.withValues(alpha: 0.4);
        break;
      case NPChipTone.cyan:
        bg = NPColors.cyan.withValues(alpha: 0.13);
        fg = NPColors.cyanSoft;
        bd = NPColors.cyan.withValues(alpha: 0.4);
        break;
      case NPChipTone.live:
        bg = NPColors.success.withValues(alpha: 0.15);
        fg = NPColors.successText;
        bd = NPColors.success.withValues(alpha: 0.45);
        break;
      default:
        bg = Colors.white.withValues(alpha: 0.06);
        fg = NPColors.text;
        bd = Colors.white.withValues(alpha: 0.10);
    }

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: bd, width: 1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: DefaultTextStyle.merge(
        style: NPTextStyles.label(color: fg, size: fontSize, spacing: 0.04).copyWith(
          fontWeight: FontWeight.w500,
        ),
        child: child,
      ),
    );
  }
}
