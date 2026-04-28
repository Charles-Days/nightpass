import 'package:flutter/material.dart';
import '../theme/np_theme.dart';
import 'np_glass.dart';

enum NPSnackType { info, error, success }

class NPSnackBar {
  static OverlayEntry? _entry;

  static void show(
    BuildContext context,
    String message, {
    NPSnackType type = NPSnackType.info,
    Duration duration = const Duration(milliseconds: 2800),
  }) {
    _entry?.remove();
    _entry = null;

    final overlay = Overlay.maybeOf(context, rootOverlay: true);
    if (overlay == null) return;

    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (ctx) => _NPSnackBarOverlay(
        message: message,
        type: type,
        duration: duration,
        onDismissed: () {
          if (identical(_entry, entry)) _entry = null;
          entry.remove();
        },
      ),
    );
    _entry = entry;
    overlay.insert(entry);
  }
}

class _NPSnackBarOverlay extends StatefulWidget {
  final String message;
  final NPSnackType type;
  final Duration duration;
  final VoidCallback onDismissed;

  const _NPSnackBarOverlay({
    required this.message,
    required this.type,
    required this.duration,
    required this.onDismissed,
  });

  @override
  State<_NPSnackBarOverlay> createState() => _NPSnackBarOverlayState();
}

class _NPSnackBarOverlayState extends State<_NPSnackBarOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _slide;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 240),
      reverseDuration: const Duration(milliseconds: 200),
    );
    _slide = Tween<Offset>(begin: const Offset(0, -1.2), end: Offset.zero)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _opacity = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _controller.forward();
    Future.delayed(widget.duration, _hide);
  }

  Future<void> _hide() async {
    if (!mounted) return;
    await _controller.reverse();
    if (!mounted) return;
    widget.onDismissed();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  ({IconData icon, Color color}) _typeStyle() {
    switch (widget.type) {
      case NPSnackType.error:
        return (icon: Icons.error_outline, color: NPColors.magenta);
      case NPSnackType.success:
        return (icon: Icons.check_circle_outline, color: NPColors.success);
      case NPSnackType.info:
        return (icon: Icons.info_outline, color: NPColors.hero);
    }
  }

  @override
  Widget build(BuildContext context) {
    final style = _typeStyle();
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: SlideTransition(
            position: _slide,
            child: FadeTransition(
              opacity: _opacity,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: _hide,
                child: NPGlass(
                  radius: 14,
                  blur: true,
                  borderColor: style.color.withValues(alpha: 0.55),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 12),
                  child: Row(
                    children: [
                      Icon(style.icon, size: 20, color: style.color),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          widget.message,
                          style: NPTextStyles.body(14),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
