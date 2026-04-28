import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../screens/auth_screen.dart';
import '../screens/bar_detail_screen.dart';
import '../screens/checkout_screen.dart';
import '../screens/event_detail_screen.dart';
import '../screens/friends_invite_screen.dart';
import '../screens/home_screen.dart';
import '../screens/pass_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/search_screen.dart';
import '../screens/signup_screen.dart';
import '../screens/splash_screen.dart';
import '../screens/stories_feed_screen.dart';
import '../screens/story_viewer_screen.dart';
import '../state/auth_controller.dart';
import '../widgets/np_tab_bar.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = ValueNotifier<AuthState>(ref.read(authProvider));
  ref.listen<AuthState>(authProvider, (_, next) => notifier.value = next);
  ref.onDispose(notifier.dispose);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: notifier,
    redirect: (context, state) {
      final auth = notifier.value;
      final loc = state.matchedLocation;
      final isSplash = loc == '/';
      final isAuthRoute = loc == '/auth' || loc == '/signup';

      if (auth.status == AuthStatus.unknown) {
        return isSplash ? null : '/';
      }
      if (auth.status == AuthStatus.unauthenticated) {
        return isAuthRoute ? null : '/auth';
      }
      if (auth.status == AuthStatus.authenticated) {
        if (isSplash || isAuthRoute) return '/home';
        return null;
      }
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/auth', builder: (_, __) => const AuthScreen()),
      GoRoute(path: '/signup', builder: (_, __) => const SignupScreen()),
      GoRoute(path: '/stories', builder: (_, __) => const StoriesFeedScreen()),
      GoRoute(path: '/story', builder: (_, __) => const StoryViewerScreen()),
      GoRoute(path: '/bar', builder: (_, __) => const BarDetailScreen()),
      GoRoute(path: '/event', builder: (_, __) => const EventDetailScreen()),
      GoRoute(path: '/checkout', builder: (_, __) => const CheckoutScreen()),
      GoRoute(path: '/friends', builder: (_, __) => const FriendsInviteScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            _MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/search', builder: (_, __) => const SearchScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/pass', builder: (_, __) => const PassScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
          ]),
        ],
      ),
    ],
  );
});

class _MainShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const _MainShell({required this.navigationShell});

  static const _tabs = [NPTab.home, NPTab.search, NPTab.ticket, NPTab.user];

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: Stack(
        children: [
          Positioned.fill(child: navigationShell),
          NPTabBar(
            active: _tabs[navigationShell.currentIndex],
            onTap: (tab) => navigationShell.goBranch(
              _tabs.indexOf(tab),
              initialLocation: tab == _tabs[navigationShell.currentIndex],
            ),
          ),
        ],
      ),
    );
  }
}
