class User {
  final String id;
  final String email;
  final String? name;
  final String role;
  final bool mustChangePassword;
  final DateTime createdAt;

  const User({
    required this.id,
    required this.email,
    this.name,
    required this.role,
    required this.mustChangePassword,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      role: json['role'] as String,
      mustChangePassword: json['mustChangePassword'] as bool,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
      'mustChangePassword': mustChangePassword,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class AuthTokens {
  final String accessToken;
  final String refreshToken;

  const AuthTokens({required this.accessToken, required this.refreshToken});

  factory AuthTokens.fromJson(Map<String, dynamic> json) {
    return AuthTokens(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
    );
  }
}

class AuthResult {
  final User user;
  final AuthTokens tokens;

  const AuthResult({required this.user, required this.tokens});

  factory AuthResult.fromJson(Map<String, dynamic> json) {
    return AuthResult(
      user: User.fromJson(json['user'] as Map<String, dynamic>),
      tokens: AuthTokens.fromJson(json),
    );
  }
}
