import 'api_client.dart';
import '../models/order.dart';

class OrdersApi {
  final ApiClient _client;

  OrdersApi(this._client);

  Future<OrderCreationResponse> create(String tierId) async {
    final resp = await _client.dio.post(
      '/orders',
      data: {'tierId': tierId},
    );
    return OrderCreationResponse.fromJson(resp.data as Map<String, dynamic>);
  }

  Future<Order> getById(String id) async {
    final resp = await _client.dio.get('/orders/$id');
    return Order.fromJson(resp.data as Map<String, dynamic>);
  }

  Future<List<Order>> listMine({int page = 1, int limit = 20}) async {
    final resp = await _client.dio.get(
      '/orders/me',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = resp.data as Map<String, dynamic>;
    final items = data['items'] as List<dynamic>? ?? [];
    return items
        .map((e) => Order.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
