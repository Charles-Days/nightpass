import 'api_client.dart';

/// Solicitud de pago en EFECTIVO (boleto digital, pago físico vía RP).
class PhysicalPaymentRequestResult {
  final String id;
  final String status;
  final int quantity;
  final int amountCents;
  final String currency;

  const PhysicalPaymentRequestResult({
    required this.id,
    required this.status,
    required this.quantity,
    required this.amountCents,
    required this.currency,
  });

  factory PhysicalPaymentRequestResult.fromJson(Map<String, dynamic> json) {
    return PhysicalPaymentRequestResult(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'PENDING',
      quantity: json['quantity'] as int? ?? 1,
      amountCents: json['amountCents'] as int? ?? 0,
      currency: (json['currency'] as String?) ?? 'MXN',
    );
  }
}

class PhysicalPaymentsApi {
  final ApiClient _client;

  PhysicalPaymentsApi(this._client);

  /// Crea una solicitud de pago en efectivo. El backend notifica por correo a
  /// los RPs asignados al evento; uno de ellos cobra en persona y confirma.
  Future<PhysicalPaymentRequestResult> createRequest(
    String tierId, {
    int quantity = 1,
    String? contactPhone,
    String? state,
    String? city,
    String? note,
  }) async {
    final resp = await _client.dio.post(
      '/physical-payments',
      data: {
        'tierId': tierId,
        'quantity': quantity,
        if (contactPhone != null && contactPhone.trim().isNotEmpty)
          'contactPhone': contactPhone.trim(),
        if (state != null && state.trim().isNotEmpty) 'state': state.trim(),
        if (city != null && city.trim().isNotEmpty) 'city': city.trim(),
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      },
    );
    return PhysicalPaymentRequestResult.fromJson(
      resp.data as Map<String, dynamic>,
    );
  }
}
