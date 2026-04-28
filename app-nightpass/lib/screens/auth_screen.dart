import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../state/auth_controller.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_logo.dart';
import '../widgets/np_snack_bar.dart';
import '../widgets/np_text_field.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();

  String? _emailError;
  String? _passwordError;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  bool _validate() {
    final email = _email.text.trim();
    final password = _password.text;
    setState(() {
      _emailError = email.isEmpty ? 'Ingresa tu email' : null;
      _passwordError = password.isEmpty ? 'Ingresa tu contraseña' : null;
    });
    return _emailError == null && _passwordError == null;
  }

  Future<void> _onSignIn() async {
    if (!_validate()) return;
    final ok = await ref.read(authProvider.notifier).signin(
          email: _email.text.trim(),
          password: _password.text,
        );
    if (!mounted) return;
    if (ok) {
      context.go('/home');
    }
  }

  void _showSoon(String provider) {
    NPSnackBar.show(
      context,
      'Sign-in con $provider llega pronto.',
      type: NPSnackType.info,
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: [
          const NPBackdrop(),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(28, 30, 28, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const NPLogo(size: 36),
                  const SizedBox(height: 48),
                  Text('Welcome back.', style: NPTextStyles.display(30)),
                  const SizedBox(height: 8),
                  Text('Tonight is waiting.',
                      style: NPTextStyles.body(15, color: NPColors.textDim)),
                  const SizedBox(height: 32),
                  Text('EMAIL', style: NPTextStyles.label(spacing: 0.08)),
                  const SizedBox(height: 8),
                  NPTextField(
                    controller: _email,
                    focusNode: _emailFocus,
                    icon: Icons.mail_outline,
                    hint: 'tu@email.com',
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autocorrect: false,
                    enableSuggestions: false,
                    errorText: _emailError,
                    onSubmitted: (_) => _passwordFocus.requestFocus(),
                  ),
                  const SizedBox(height: 16),
                  Text('PASSWORD', style: NPTextStyles.label(spacing: 0.08)),
                  const SizedBox(height: 8),
                  NPTextField(
                    controller: _password,
                    focusNode: _passwordFocus,
                    icon: Icons.lock_outline,
                    hint: '••••••••',
                    obscureText: true,
                    showVisibilityToggle: true,
                    autocorrect: false,
                    enableSuggestions: false,
                    textInputAction: TextInputAction.done,
                    errorText: _passwordError,
                    onSubmitted: (_) => _onSignIn(),
                  ),
                  if (auth.error != null) ...[
                    const SizedBox(height: 14),
                    Text(
                      auth.error!,
                      style: NPTextStyles.body(13, color: NPColors.magenta),
                    ),
                  ],
                  const SizedBox(height: 24),
                  NPPrimary(
                    full: true,
                    onPressed: auth.isLoading ? null : _onSignIn,
                    child: auth.isLoading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Sign in'),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                          child: Container(height: 1, color: NPColors.hairline)),
                      const SizedBox(width: 10),
                      Text('OR',
                          style: NPTextStyles.label(
                              color: NPColors.textFaint, spacing: 0.1)),
                      const SizedBox(width: 10),
                      Expanded(
                          child: Container(height: 1, color: NPColors.hairline)),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: NPGhost(
                          onPressed: () => _showSoon('Apple'),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.apple, size: 18, color: NPColors.text),
                              SizedBox(width: 8),
                              Text('Apple'),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: NPGhost(
                          onPressed: () => _showSoon('Google'),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.g_mobiledata,
                                  size: 22, color: NPColors.text),
                              SizedBox(width: 4),
                              Text('Google'),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 36),
                  Center(
                    child: GestureDetector(
                      onTap: () => context.go('/signup'),
                      child: RichText(
                        text: TextSpan(
                          style:
                              NPTextStyles.body(13, color: NPColors.textDim),
                          children: [
                            const TextSpan(text: 'New here? '),
                            TextSpan(
                              text: 'Create account',
                              style: NPTextStyles.body(13,
                                  color: NPColors.hero, w: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
