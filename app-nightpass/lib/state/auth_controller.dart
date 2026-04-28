import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/auth_api.dart';
import '../models/user.dart';
import '../services/token_storage.dart';

enum AuthStatus { unknown, unauthenticated, authenticated }

class AuthState {
  final AuthStatus status;
  final User? user;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.status = AuthStatus.unknown,
    this.user,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    AuthStatus? status,
    User? user,
    bool? isLoading,
    String? error,
    bool clearError = false,
    bool clearUser = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: clearUser ? null : (user ?? this.user),
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

final tokenStorageProvider = Provider<TokenStorage>((_) => TokenStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(storage: ref.read(tokenStorageProvider));
});

final authApiProvider = Provider<AuthApi>((ref) {
  return AuthApi(ref.read(apiClientProvider));
});

final authProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(
    api: ref.read(authApiProvider),
    storage: ref.read(tokenStorageProvider),
    apiClient: ref.read(apiClientProvider),
  );
});

class AuthController extends StateNotifier<AuthState> {
  final AuthApi api;
  final TokenStorage storage;
  final ApiClient apiClient;

  AuthController({
    required this.api,
    required this.storage,
    required this.apiClient,
  }) : super(const AuthState()) {
    apiClient.onRefreshNeeded = _tryRefresh;
    apiClient.onUnauthorized = _forceSignOut;
  }

  Future<void> bootstrap() async {
    final start = DateTime.now();
    const minSplashDuration = Duration(milliseconds: 1900);

    final access = await storage.readAccess();
    if (access == null) {
      await _ensureMinDuration(start, minSplashDuration);
      state = state.copyWith(status: AuthStatus.unauthenticated);
      return;
    }
    try {
      final user = await api.me();
      await _ensureMinDuration(start, minSplashDuration);
      state = state.copyWith(status: AuthStatus.authenticated, user: user);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        await storage.clear();
      }
      await _ensureMinDuration(start, minSplashDuration);
      state = state.copyWith(status: AuthStatus.unauthenticated, clearUser: true);
    } catch (_) {
      await _ensureMinDuration(start, minSplashDuration);
      state = state.copyWith(status: AuthStatus.unauthenticated, clearUser: true);
    }
  }

  Future<void> _ensureMinDuration(DateTime start, Duration minimum) async {
    final elapsed = DateTime.now().difference(start);
    if (elapsed < minimum) {
      await Future.delayed(minimum - elapsed);
    }
  }

  Future<bool> signin({required String email, required String password}) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final result = await api.signin(email: email, password: password);
      await storage.save(
        access: result.tokens.accessToken,
        refresh: result.tokens.refreshToken,
      );
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: result.user,
        isLoading: false,
      );
      return true;
    } on DioException catch (e) {
      state = state.copyWith(isLoading: false, error: _readError(e));
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Unexpected error: $e');
      return false;
    }
  }

  Future<bool> signup({
    required String email,
    required String password,
    String? name,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final result = await api.signup(
        email: email,
        password: password,
        name: name,
      );
      await storage.save(
        access: result.tokens.accessToken,
        refresh: result.tokens.refreshToken,
      );
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: result.user,
        isLoading: false,
      );
      return true;
    } on DioException catch (e) {
      state = state.copyWith(isLoading: false, error: _readError(e));
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Unexpected error: $e');
      return false;
    }
  }

  Future<void> signout() async {
    await storage.clear();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<bool> _tryRefresh() async {
    final refresh = await storage.readRefresh();
    if (refresh == null) return false;
    try {
      final tokens = await api.refresh(refresh);
      await storage.save(
        access: tokens.accessToken,
        refresh: tokens.refreshToken,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _forceSignOut() async {
    await storage.clear();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  String _readError(DioException e) {
    final data = e.response?.data;
    if (data is Map) {
      final msg = data['message'];
      if (msg is String) return msg;
      if (msg is List && msg.isNotEmpty) return msg.first.toString();
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.connectionError) {
      return 'No se pudo conectar al servidor.';
    }
    return e.message ?? 'Algo falló.';
  }
}
