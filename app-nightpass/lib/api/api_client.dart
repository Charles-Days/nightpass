import 'package:dio/dio.dart';
import '../services/token_storage.dart';

const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:7101/api/v1',
);

class ApiClient {
  final Dio dio;
  final TokenStorage _storage;

  /// Set externally by AuthController so a 401 can attempt a refresh.
  Future<bool> Function()? onRefreshNeeded;

  /// Called when refresh fails and the user should be logged out.
  Future<void> Function()? onUnauthorized;

  ApiClient({required TokenStorage storage})
      : _storage = storage,
        dio = Dio(BaseOptions(
          baseUrl: apiBaseUrl,
          connectTimeout: const Duration(seconds: 8),
          receiveTimeout: const Duration(seconds: 12),
          contentType: 'application/json',
        )) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        if (options.extra['skipAuth'] != true) {
          final token = await _storage.readAccess();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }
        handler.next(options);
      },
      onError: (err, handler) async {
        final isUnauthorized = err.response?.statusCode == 401;
        final alreadyRetried = err.requestOptions.extra['retried'] == true;
        final isAuthEndpoint =
            err.requestOptions.path.startsWith('/auth/refresh') ||
                err.requestOptions.path.startsWith('/auth/signin') ||
                err.requestOptions.path.startsWith('/auth/signup');

        if (isUnauthorized && !alreadyRetried && !isAuthEndpoint) {
          final ok = (await onRefreshNeeded?.call()) ?? false;
          if (ok) {
            try {
              final retried = await _retry(err.requestOptions);
              return handler.resolve(retried);
            } catch (_) {
              await onUnauthorized?.call();
              return handler.next(err);
            }
          } else {
            await onUnauthorized?.call();
            return handler.next(err);
          }
        }
        handler.next(err);
      },
    ));
  }

  Future<Response<dynamic>> _retry(RequestOptions opts) async {
    final newToken = await _storage.readAccess();
    final headers = Map<String, dynamic>.from(opts.headers)
      ..['Authorization'] = 'Bearer $newToken';
    return dio.fetch<dynamic>(opts.copyWith(
      headers: headers,
      extra: {...opts.extra, 'retried': true},
    ));
  }
}
