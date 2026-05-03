class Pass {
  final String id;
  final String orderId;
  final String userId;
  final String eventId;
  final String qrCode;
  final DateTime? usedAt;
  final DateTime createdAt;
  final String? eventTitle;
  final DateTime? eventStartsAt;
  final String? eventCoverUrl;
  final String? venueName;
  final String? venueAddress;
  final String? tierName;

  const Pass({
    required this.id,
    required this.orderId,
    required this.userId,
    required this.eventId,
    required this.qrCode,
    this.usedAt,
    required this.createdAt,
    this.eventTitle,
    this.eventStartsAt,
    this.eventCoverUrl,
    this.venueName,
    this.venueAddress,
    this.tierName,
  });

  bool get isUsed => usedAt != null;

  factory Pass.fromJson(Map<String, dynamic> json) {
    final event = json['event'] as Map<String, dynamic>?;
    final venue = event?['venue'] as Map<String, dynamic>?;
    final order = json['order'] as Map<String, dynamic>?;
    final tier = order?['tier'] as Map<String, dynamic>?;

    return Pass(
      id: json['id'] as String,
      orderId: json['orderId'] as String,
      userId: json['userId'] as String,
      eventId: json['eventId'] as String,
      qrCode: json['qrCode'] as String,
      usedAt:
          json['usedAt'] != null ? DateTime.parse(json['usedAt'] as String) : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      eventTitle: event?['title'] as String?,
      eventStartsAt: event?['startsAt'] != null
          ? DateTime.parse(event!['startsAt'] as String)
          : null,
      eventCoverUrl: event?['coverImageUrl'] as String?,
      venueName: venue?['name'] as String?,
      venueAddress: venue?['address'] as String?,
      tierName: tier?['name'] as String?,
    );
  }
}
