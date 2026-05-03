class EventTier {
  final String id;
  final String name;
  final int priceCents;
  final String currency;
  final int? capacity;
  final int position;

  const EventTier({
    required this.id,
    required this.name,
    required this.priceCents,
    required this.currency,
    this.capacity,
    this.position = 0,
  });

  factory EventTier.fromJson(Map<String, dynamic> json) {
    return EventTier(
      id: json['id'] as String,
      name: json['name'] as String,
      priceCents: json['priceCents'] as int,
      currency: (json['currency'] as String?) ?? 'MXN',
      capacity: json['capacity'] as int?,
      position: json['position'] as int? ?? 0,
    );
  }
}

class Event {
  final String id;
  final String venueId;
  final String slug;
  final String title;
  final String? description;
  final DateTime startsAt;
  final DateTime endsAt;
  final String? coverImageUrl;
  final String status;
  final int? capacity;
  final List<EventTier> tiers;
  final String? venueName;
  final String? venueSlug;
  final String? venueCity;
  final String? venueAddress;

  const Event({
    required this.id,
    required this.venueId,
    required this.slug,
    required this.title,
    this.description,
    required this.startsAt,
    required this.endsAt,
    this.coverImageUrl,
    required this.status,
    this.capacity,
    this.tiers = const [],
    this.venueName,
    this.venueSlug,
    this.venueCity,
    this.venueAddress,
  });

  factory Event.fromJson(Map<String, dynamic> json) {
    final venue = json['venue'] as Map<String, dynamic>?;
    return Event(
      id: json['id'] as String,
      venueId: (json['venueId'] as String?) ?? venue?['id'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      title: json['title'] as String,
      description: json['description'] as String?,
      startsAt: DateTime.parse(json['startsAt'] as String),
      endsAt: DateTime.parse(json['endsAt'] as String),
      coverImageUrl: json['coverImageUrl'] as String?,
      status: json['status'] as String? ?? 'PUBLISHED',
      capacity: json['capacity'] as int?,
      tiers: (json['tiers'] as List<dynamic>?)
              ?.map((e) => EventTier.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      venueName: venue?['name'] as String?,
      venueSlug: venue?['slug'] as String?,
      venueCity: venue?['city'] as String?,
      venueAddress: venue?['address'] as String?,
    );
  }
}
