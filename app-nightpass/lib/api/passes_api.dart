import 'api_client.dart';
import '../models/pass.dart';

class PassesApi {
  final ApiClient _client;

  PassesApi(this._client);

  Future<List<Pass>> listMine() async {
    final resp = await _client.dio.get('/passes/me');
    final data = resp.data;
    if (data is List) {
      return data
          .map((e) => Pass.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<Pass> getById(String id) async {
    final resp = await _client.dio.get('/passes/$id');
    return Pass.fromJson(resp.data as Map<String, dynamic>);
  }

  Future<ScanResult> scan(String qrCode) async {
    final resp = await _client.dio.post(
      '/passes/scan',
      data: {'qrCode': qrCode},
    );
    return ScanResult.fromJson(resp.data as Map<String, dynamic>);
  }
}

class ScanResult {
  final bool valid;
  final String? reason;
  final DateTime usedAt;
  final String eventTitle;
  final String? venueName;
  final String? attendeeName;
  final String? tierName;

  const ScanResult({
    required this.valid,
    this.reason,
    required this.usedAt,
    required this.eventTitle,
    this.venueName,
    this.attendeeName,
    this.tierName,
  });

  factory ScanResult.fromJson(Map<String, dynamic> json) {
    final event = json['event'] as Map<String, dynamic>?;
    final holder = json['holder'] as Map<String, dynamic>?;
    final tier = json['tier'] as Map<String, dynamic>?;
    return ScanResult(
      valid: json['valid'] as bool? ?? false,
      reason: json['reason'] as String?,
      usedAt: DateTime.parse(json['usedAt'] as String),
      eventTitle: event?['title'] as String? ?? 'Evento',
      venueName: event?['venue'] as String?,
      attendeeName: (holder?['name'] ?? holder?['email']) as String?,
      tierName: tier?['name'] as String?,
    );
  }
}
