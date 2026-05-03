enum OrderStatus { pending, completed, refunded, failed, unknown }

OrderStatus _parseStatus(String? raw) {
  switch (raw) {
    case 'PENDING':
      return OrderStatus.pending;
    case 'COMPLETED':
      return OrderStatus.completed;
    case 'REFUNDED':
      return OrderStatus.refunded;
    case 'FAILED':
      return OrderStatus.failed;
    default:
      return OrderStatus.unknown;
  }
}

class Order {
  final String id;
  final String userId;
  final String eventId;
  final String tierId;
  final OrderStatus status;
  final int totalCents;
  final int applicationFeeCents;
  final String currency;
  final String? stripePaymentIntentId;
  final DateTime createdAt;
  final String? passId;

  const Order({
    required this.id,
    required this.userId,
    required this.eventId,
    required this.tierId,
    required this.status,
    required this.totalCents,
    required this.applicationFeeCents,
    required this.currency,
    this.stripePaymentIntentId,
    required this.createdAt,
    this.passId,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    final pass = json['pass'] as Map<String, dynamic>?;
    return Order(
      id: json['id'] as String,
      userId: json['userId'] as String,
      eventId: json['eventId'] as String,
      tierId: json['tierId'] as String,
      status: _parseStatus(json['status'] as String?),
      totalCents: json['totalCents'] as int,
      applicationFeeCents: json['applicationFeeCents'] as int? ?? 0,
      currency: (json['currency'] as String?) ?? 'MXN',
      stripePaymentIntentId: json['stripePaymentIntentId'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      passId: pass?['id'] as String?,
    );
  }
}

class OrderCreationResponse {
  final String orderId;
  final String clientSecret;
  final String? publishableKey;

  const OrderCreationResponse({
    required this.orderId,
    required this.clientSecret,
    this.publishableKey,
  });

  factory OrderCreationResponse.fromJson(Map<String, dynamic> json) {
    return OrderCreationResponse(
      orderId: json['orderId'] as String,
      clientSecret: json['clientSecret'] as String,
      publishableKey: json['publishableKey'] as String?,
    );
  }
}
