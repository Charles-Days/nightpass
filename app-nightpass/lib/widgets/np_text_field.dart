import 'package:flutter/material.dart';
import '../theme/np_theme.dart';
import 'np_glass.dart';

class NPTextField extends StatefulWidget {
  final TextEditingController controller;
  final IconData icon;
  final String hint;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final void Function(String)? onSubmitted;
  final String? Function(String)? validator;
  final FocusNode? focusNode;
  final bool autocorrect;
  final bool enableSuggestions;
  final TextCapitalization textCapitalization;

  /// External error message. When non-null, takes precedence over the internal
  /// validator state. Pass null to clear.
  final String? errorText;

  /// When true, shows a tap-able eye icon at the trailing edge that toggles
  /// obscure text on/off. Only meaningful when [obscureText] is true.
  final bool showVisibilityToggle;

  const NPTextField({
    super.key,
    required this.controller,
    required this.icon,
    required this.hint,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.onSubmitted,
    this.validator,
    this.focusNode,
    this.autocorrect = true,
    this.enableSuggestions = true,
    this.textCapitalization = TextCapitalization.none,
    this.errorText,
    this.showVisibilityToggle = false,
  });

  @override
  State<NPTextField> createState() => _NPTextFieldState();
}

class _NPTextFieldState extends State<NPTextField> {
  late final FocusNode _focusNode;
  String? _internalError;
  late bool _obscured;

  String? get _effectiveError => widget.errorText ?? _internalError;

  @override
  void initState() {
    super.initState();
    _obscured = widget.obscureText;
    _focusNode = widget.focusNode ?? FocusNode();
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void didUpdateWidget(covariant NPTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.obscureText != widget.obscureText) {
      _obscured = widget.obscureText;
    }
  }

  void _onFocusChange() {
    if (!_focusNode.hasFocus && widget.validator != null) {
      setState(() => _internalError = widget.validator!(widget.controller.text));
    }
    setState(() {});
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    if (widget.focusNode == null) _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final focused = _focusNode.hasFocus;
    final error = _effectiveError;
    final showToggle = widget.showVisibilityToggle && widget.obscureText;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        NPGlass(
          radius: 12,
          borderColor: error != null
              ? NPColors.magenta
              : focused
                  ? NPColors.hero2
                  : null,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            children: [
              Icon(
                widget.icon,
                size: 18,
                color: focused ? NPColors.hero : NPColors.textDim,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: widget.controller,
                  focusNode: _focusNode,
                  obscureText: _obscured,
                  keyboardType: widget.keyboardType,
                  textInputAction: widget.textInputAction,
                  autocorrect: widget.autocorrect,
                  enableSuggestions: widget.enableSuggestions,
                  textCapitalization: widget.textCapitalization,
                  cursorColor: NPColors.hero,
                  style: NPTextStyles.body(15),
                  decoration: InputDecoration(
                    border: InputBorder.none,
                    isCollapsed: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                    hintText: widget.hint,
                    hintStyle: NPTextStyles.body(15, color: NPColors.textFaint),
                  ),
                  onSubmitted: widget.onSubmitted,
                  onChanged: (_) {
                    if (_internalError != null) {
                      setState(() => _internalError = null);
                    }
                  },
                ),
              ),
              if (showToggle)
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => setState(() => _obscured = !_obscured),
                  child: Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: Icon(
                      _obscured
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                      size: 19,
                      color: focused ? NPColors.hero : NPColors.textDim,
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (error != null)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 4),
            child: Text(
              error,
              style: NPTextStyles.body(12, color: NPColors.magenta),
            ),
          ),
      ],
    );
  }
}
