import 'package:dio/dio.dart';
import '../models/user.dart';
import 'api_client.dart';

class AuthApi {
  final ApiClient _api;
  AuthApi(this._api);

  Future<AuthResult> signup({
    required String email,
    required String password,
    String? name,
  }) async {
    final res = await _api.dio.post<Map<String, dynamic>>(
      '/auth/signup',
      data: {
        'email': email,
        'password': password,
        if (name != null && name.isNotEmpty) 'name': name,
      },
      options: Options(extra: {'skipAuth': true}),
    );
    return AuthResult.fromJson(res.data!);
  }

  Future<AuthResult> signin({
    required String email,
    required String password,
  }) async {
    final res = await _api.dio.post<Map<String, dynamic>>(
      '/auth/signin',
      data: {'email': email, 'password': password},
      options: Options(extra: {'skipAuth': true}),
    );
    return AuthResult.fromJson(res.data!);
  }

  Future<AuthTokens> refresh(String refreshToken) async {
    final res = await _api.dio.post<Map<String, dynamic>>(
      '/auth/refresh',
      data: {'refreshToken': refreshToken},
      options: Options(extra: {'skipAuth': true}),
    );
    return AuthTokens.fromJson(res.data!);
  }

  Future<User> me() async {
    final res = await _api.dio.get<Map<String, dynamic>>('/auth/me');
    return User.fromJson(res.data!);
  }
}
