import 'package:dio/dio.dart';
import 'api_client.dart';
import '../models/venue.dart';

class VenueApi {
  final ApiClient _client;

  VenueApi(this._client);

  Future<List<Venue>> list({String? search}) async {
    final Map<String, dynamic> query = {};
    if (search != null && search.isNotEmpty) {
      query['search'] = search;
    }

    final resp = await _client.dio.get(
      '/venues',
      queryParameters: query,
      options: Options(extra: {'skipAuth': true}),
    );

    final data = resp.data;
    if (data is List) {
      return data.map((e) => Venue.fromJson(e as Map<String, dynamic>)).toList();
    } else if (data is Map && data['items'] is List) {
      final List items = data['items'];
      return items.map((e) => Venue.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<Venue> getById(String id) async {
    final resp = await _client.dio.get(
      '/venues/$id',
      options: Options(extra: {'skipAuth': true}),
    );
    return Venue.fromJson(resp.data as Map<String, dynamic>);
  }
}
