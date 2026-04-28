import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../state/auth_controller.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_logo.dart';
import '../widgets/np_text_field.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();

  String? _emailError;
  String? _passwordError;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  bool _validate() {
    final email = _email.text.trim();
    final password = _password.text;

    String? emailErr;
    if (email.isEmpty) {
      emailErr = 'Ingresa tu email';
    } else if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      emailErr = 'Email no válido';
    }

    String? passwordErr;
    if (password.isEmpty) {
      passwordErr = 'Ingresa una contraseña';
    } else if (password.length < 8) {
      passwordErr = 'Mínimo 8 caracteres';
    }

    setState(() {
      _emailError = emailErr;
      _passwordError = passwordErr;
    });
    return emailErr == null && passwordErr == null;
  }

  Future<void> _onSignUp() async {
    if (!_validate()) return;
    final name = _name.text.trim();
    final ok = await ref.read(authProvider.notifier).signup(
          email: _email.text.trim(),
          password: _password.text,
          name: name.isEmpty ? null : name,
        );
    if (!mounted) return;
    if (ok) {
      context.go('/home');
    }
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
                  Row(
                    children: [
                      const NPLogo(size: 32),
                      const Spacer(),
                      GestureDetector(
                        onTap: () => context.go('/auth'),
                        child: Text(
                          'Sign in',
                          style: NPTextStyles.heading(13,
                              w: FontWeight.w600, color: NPColors.hero),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 48),
                  Text('Crea tu cuenta.',
                      style: NPTextStyles.display(30)),
                  const SizedBox(height: 8),
                  Text(
                    'La noche te espera.',
                    style: NPTextStyles.body(15, color: NPColors.textDim),
                  ),
                  const SizedBox(height: 32),
                  Text('NOMBRE (opcional)',
                      style: NPTextStyles.label(spacing: 0.08)),
                  const SizedBox(height: 8),
                  NPTextField(
                    controller: _name,
                    icon: Icons.person_outline,
                    hint: 'Tu nombre',
                    textInputAction: TextInputAction.next,
                    textCapitalization: TextCapitalization.words,
                    onSubmitted: (_) => _emailFocus.requestFocus(),
                  ),
                  const SizedBox(height: 16),
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
                    hint: 'Mínimo 8 caracteres',
                    obscureText: true,
                    showVisibilityToggle: true,
                    autocorrect: false,
                    enableSuggestions: false,
                    textInputAction: TextInputAction.done,
                    errorText: _passwordError,
                    onSubmitted: (_) => _onSignUp(),
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
                    onPressed: auth.isLoading ? null : _onSignUp,
                    child: auth.isLoading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Create account'),
                  ),
                  const SizedBox(height: 24),
                  Center(
                    child: Text(
                      'Al crear cuenta aceptas los Términos y la Política de Privacidad.',
                      textAlign: TextAlign.center,
                      style: NPTextStyles.body(12, color: NPColors.textFaint),
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
