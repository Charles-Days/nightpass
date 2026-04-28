import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'router/app_router.dart';
import 'state/auth_controller.dart';
import 'theme/np_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: NPColors.base,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
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
