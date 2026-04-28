import 'package:flutter/material.dart';
import '../theme/np_theme.dart';

class NPCapacity extends StatelessWidget {
  final int pct;
  final String? label;

  const NPCapacity({super.key, this.pct = 60, this.label});

  Color get _color => pct > 85
      ? NPColors.magenta
      : pct > 60
          ? NPColors.warning
          : NPColors.successText;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label == null || label!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  (label ?? 'Capacity').toUpperCase(),
                  style: NPTextStyles.body(11, color: NPColors.textDim).copyWith(letterSpacing: 0.66),
                ),
                Text(
                  '$pct%',
                  style: NPTextStyles.heading(12, w: FontWeight.w600, color: _color),
                ),
              ],
            ),
          ),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: Container(
            height: 5,
            color: Colors.white.withValues(alpha: 0.06),
            child: Align(
              alignment: Alignment.centerLeft,
              child: FractionallySizedBox(
                widthFactor: pct / 100.0,
                child: Container(
                  decoration: BoxDecoration(
                    color: _color,
                    boxShadow: [BoxShadow(color: _color, blurRadius: 12)],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
