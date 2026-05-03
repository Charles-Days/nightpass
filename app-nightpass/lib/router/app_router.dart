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
import '../screens/scanner_screen.dart';
import '../screens/search_screen.dart';
import '../screens/signup_screen.dart';
import '../screens/splash_screen.dart';
import '../screens/stories_feed_screen.dart';
import '../screens/story_viewer_screen.dart';
import '../models/event.dart';
import '../models/venue.dart';
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
        final isStaff = _isStaffRole(auth.user?.role);
        if (isSplash || isAuthRoute) return isStaff ? '/scanner' : '/home';
        if (isStaff && (loc == '/home' || loc == '/pass')) return '/scanner';
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
      GoRoute(
        path: '/bar',
        builder: (context, state) => BarDetailScreen(venue: state.extra as Venue),
      ),
      GoRoute(
        path: '/event',
        builder: (context, state) {
          final extra = state.extra;
          return EventDetailScreen(eventArg: extra is Event ? extra : null);
        },
      ),
      GoRoute(
        path: '/checkout',
        builder: (context, state) => CheckoutScreen(
          tierId: state.uri.queryParameters['tierId'] ?? '',
          eventId: state.uri.queryParameters['eventId'] ?? '',
          extra: state.extra is CheckoutExtra ? state.extra as CheckoutExtra : null,
        ),
      ),
      GoRoute(path: '/friends', builder: (_, __) => const FriendsInviteScreen()),
      GoRoute(
        path: '/pass-detail',
        builder: (context, state) => PassScreen(
          passId: state.uri.queryParameters['passId'],
        ),
      ),
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
            GoRoute(
              path: '/pass',
              builder: (context, state) => PassScreen(
                passId: state.uri.queryParameters['passId'],
              ),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/scanner', builder: (_, __) => const ScannerScreen()),
          ]),
        ],
      ),
    ],
  );
});

bool _isStaffRole(String? role) =>
    role == 'VENUE_STAFF' || role == 'VENUE_OWNER' || role == 'ADMIN';

class _MainShell extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;
  const _MainShell({required this.navigationShell});

  /// Branch order debe coincidir con declaración de `branches:` arriba.
  /// Index → tab para mapeo bidireccional.
  static const _branchToTab = [
    NPTab.home,    // 0
    NPTab.search,  // 1
    NPTab.ticket,  // 2
    NPTab.user,    // 3
    NPTab.scanner, // 4
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authProvider.select((s) => s.user?.role));
    final isStaff = _isStaffRole(role);
    final visibleTabs = isStaff
        ? const [NPTab.scanner, NPTab.search, NPTab.user]
        : const [NPTab.home, NPTab.search, NPTab.ticket, NPTab.user];

    final currentTab = _branchToTab[navigationShell.currentIndex];
    final activeTab =
        visibleTabs.contains(currentTab) ? currentTab : visibleTabs.first;

    return Material(
      type: MaterialType.transparency,
      child: Stack(
        children: [
          Positioned.fill(child: navigationShell),
          NPTabBar(
            active: activeTab,
            tabs: visibleTabs,
            onTap: (tab) {
              final branchIndex = _branchToTab.indexOf(tab);
              navigationShell.goBranch(
                branchIndex,
                initialLocation: tab == currentTab,
              );
            },
          ),
        ],
      ),
    );
  }
}
