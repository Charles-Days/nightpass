import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'router/app_router.dart';
import 'state/auth_controller.dart';
import 'theme/np_theme.dart';

const _stripePublishableKey = String.fromEnvironment(
  'STRIPE_PUBLISHABLE_KEY',
  defaultValue:
      'pk_test_51TS7ESH8Jg3YKGH2cxSq8jEozUIjXgquXr8dtQgrllKXz4AShNEvrjpO6SEycXMfuxX0vP7g21UKFhFnRG9HSRYF00n7EpcrZi',
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: NPColors.base,
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  if (_stripePublishableKey.isNotEmpty) {
    Stripe.publishableKey = _stripePublishableKey;
    Stripe.merchantIdentifier = 'merchant.com.nightpass';
    await Stripe.instance.applySettings();
  }

  runApp(const ProviderScope(child: NightPassApp()));
}

class NightPassApp extends ConsumerStatefulWidget {
  const NightPassApp({super.key});

  @override
  ConsumerState<NightPassApp> createState() => _NightPassAppState();
}

class _NightPassAppState extends ConsumerState<NightPassApp> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(authProvider.notifier).bootstrap();
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'NightPass',
      debugShowCheckedModeBanner: false,
      theme: buildNPTheme(),
      routerConfig: router,
    );
  }
}
