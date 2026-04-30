class Photo {
  final String id;
  final String url;
  final int position;

  const Photo({
    required this.id,
    required this.url,
    required this.position,
  });

  factory Photo.fromJson(Map<String, dynamic> json) {
    return Photo(
      id: json['id'] as String,
      url: json['url'] as String,
      position: json['position'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'url': url,
      'position': position,
    };
  }
}

class Venue {
  final String id;
  final String name;
  final String city;
  final String? address;
  final String? phone;
  final String? description;
  final int? capacity;
  final int? priceFromCents;
  final String? currency;
  final double? latitude;
  final double? longitude;
  final String? coverImageUrl;
  final List<String> categories;
  final Map<String, dynamic>? openHours;
  final String? menuUrl;
  final List<String> musicTypes;
  final Map<String, dynamic>? socialLinks;
  final String? dressCode;
  final int? minAge;
  final List<Photo> photos;

  const Venue({
    required this.id,
    required this.name,
    required this.city,
    this.address,
    this.phone,
    this.description,
    this.capacity,
    this.priceFromCents,
    this.currency,
    this.latitude,
    this.longitude,
    this.coverImageUrl,
    this.categories = const [],
    this.openHours,
    this.menuUrl,
    this.musicTypes = const [],
    this.socialLinks,
    this.dressCode,
    this.minAge,
    this.photos = const [],
  });

  factory Venue.fromJson(Map<String, dynamic> json) {
    return Venue(
      id: json['id'] as String,
      name: json['name'] as String,
      city: json['city'] as String,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      description: json['description'] as String?,
      capacity: json['capacity'] as int?,
      priceFromCents: json['priceFromCents'] as int?,
      currency: json['currency'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      coverImageUrl: json['coverImageUrl'] as String?,
      categories: (json['categories'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      openHours: json['openHours'] as Map<String, dynamic>?,
      menuUrl: json['menuUrl'] as String?,
      musicTypes: (json['musicTypes'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      socialLinks: json['socialLinks'] as Map<String, dynamic>?,
      dressCode: json['dressCode'] as String?,
      minAge: json['minAge'] as int?,
      photos: (json['photos'] as List<dynamic>?)
              ?.map((e) => Photo.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'city': city,
      'address': address,
      'phone': phone,
      'description': description,
      'capacity': capacity,
      'priceFromCents': priceFromCents,
      'currency': currency,
      'latitude': latitude,
      'longitude': longitude,
      'coverImageUrl': coverImageUrl,
      'categories': categories,
      'openHours': openHours,
      'menuUrl': menuUrl,
      'musicTypes': musicTypes,
      'socialLinks': socialLinks,
      'dressCode': dressCode,
      'minAge': minAge,
      'photos': photos.map((e) => e.toJson()).toList(),
    };
  }
}
