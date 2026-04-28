import 'package:flutter_test/flutter_test.dart';
import 'package:nightpass/main.dart';

void main() {
  testWidgets('App boots without errors', (WidgetTester tester) async {
    await tester.pumpWidget(const NightPassApp());
    expect(find.text('NightPass'), findsWidgets);
  });
}
