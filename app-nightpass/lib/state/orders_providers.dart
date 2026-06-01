import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/orders_api.dart';
import '../api/passes_api.dart';
import '../api/physical_payments_api.dart';
import 'auth_controller.dart';

final ordersApiProvider = Provider<OrdersApi>((ref) {
  return OrdersApi(ref.read(apiClientProvider));
});

final physicalPaymentsApiProvider = Provider<PhysicalPaymentsApi>((ref) {
  return PhysicalPaymentsApi(ref.read(apiClientProvider));
});

final passesApiProvider = Provider<PassesApi>((ref) {
  return PassesApi(ref.read(apiClientProvider));
});
