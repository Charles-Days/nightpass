import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:go_router/go_router.dart';
import '../models/event.dart';
import '../models/order.dart';
import '../state/orders_providers.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_glass.dart';

/// Datos opcionales de UI inmediato pasados via go_router state.extra.
class CheckoutExtra {
  final Event? event;
  final EventTier? tier;

  const CheckoutExtra({this.event, this.tier});
}

class CheckoutScreen extends ConsumerStatefulWidget {
  final String tierId;
  final String eventId;
  final CheckoutExtra? extra;

  const CheckoutScreen({
    super.key,
    required this.tierId,
    required this.eventId,
    this.extra,
  });

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

enum _CheckoutPhase { initializing, ready, paying, awaitingPass, done, error }

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  _CheckoutPhase _phase = _CheckoutPhase.initializing;
  String? _orderId;
  String? _clientSecret;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initOrder());
  }

  Future<void> _initOrder() async {
    if (widget.tierId.isEmpty) {
      setState(() {
        _phase = _CheckoutPhase.error;
        _errorMessage = 'Tier no especificado';
      });
      return;
    }

    if (Stripe.publishableKey.isEmpty) {
      setState(() {
        _phase = _CheckoutPhase.error;
        _errorMessage =
            'Stripe no configurado en la app (STRIPE_PUBLISHABLE_KEY)';
      });
      return;
    }

    try {
      final api = ref.read(ordersApiProvider);
      final created = await api.create(widget.tierId);
      _orderId = created.orderId;
      _clientSecret = created.clientSecret;

      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: created.clientSecret,
          merchantDisplayName: 'NightPass',
          style: ThemeMode.dark,
          appearance: const PaymentSheetAppearance(
            colors: PaymentSheetAppearanceColors(primary: NPColors.hero),
          ),
        ),
      );

      if (!mounted) return;
      setState(() => _phase = _CheckoutPhase.ready);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _phase = _CheckoutPhase.error;
        _errorMessage = _formatError(e);
      });
    }
  }

  Future<void> _pay() async {
    if (_clientSecret == null || _orderId == null) return;
    setState(() => _phase = _CheckoutPhase.paying);

    try {
      await Stripe.instance.presentPaymentSheet();
      if (!mounted) return;
      setState(() => _phase = _CheckoutPhase.awaitingPass);
      await _pollForPass(_orderId!);
    } on StripeException catch (e) {
      if (!mounted) return;
      setState(() {
        _phase = _CheckoutPhase.ready;
        _errorMessage =
            e.error.localizedMessage ?? e.error.message ?? 'Pago cancelado';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _phase = _CheckoutPhase.ready;
        _errorMessage = _formatError(e);
      });
    }
  }

  Future<void> _pollForPass(String orderId) async {
    final api = ref.read(ordersApiProvider);
    const maxAttempts = 10;
    for (int i = 0; i < maxAttempts; i++) {
      try {
        final order = await api.getById(orderId);
        if (order.status == OrderStatus.completed && order.passId != null) {
          if (!mounted) return;
          setState(() => _phase = _CheckoutPhase.done);
          context.go('/pass-detail?passId=${order.passId}');
          return;
        }
        if (order.status == OrderStatus.failed ||
            order.status == OrderStatus.refunded) {
          if (!mounted) return;
          setState(() {
            _phase = _CheckoutPhase.error;
            _errorMessage = 'El pago no se completó';
          });
          return;
        }
      } catch (_) {
        // ignore intermittent
      }
      await Future.delayed(const Duration(milliseconds: 1500));
    }

    if (!mounted) return;
    setState(() {
      _phase = _CheckoutPhase.error;
      _errorMessage =
          'Pago confirmado pero el pase aún no se generó. Revisa tus pases en unos minutos.';
    });
  }

  String _formatError(Object e) {
    final s = e.toString();
    if (s.length > 200) return '${s.substring(0, 200)}…';
    return s;
  }

  @override
  Widget build(BuildContext context) {
    final tier = widget.extra?.tier;
    final event = widget.extra?.event;
    final priceCents = tier?.priceCents;
    final currency = tier?.currency ?? 'MXN';

    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          SafeArea(
            bottom: false,
            child: ListView(
              padding: const EdgeInsets.only(top: 8, bottom: 130),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 18),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () =>
                            context.canPop() ? context.pop() : context.go('/home'),
                        child: const Icon(Icons.arrow_back_ios_new_rounded,
                            size: 20, color: NPColors.text),
                      ),
                      const SizedBox(width: 14),
                      Text('Checkout', style: NPTextStyles.display(22)),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: NPGlass(
                    padding: const EdgeInsets.all(14),
                    radius: 18,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          event?.title ?? 'Evento',
                          style: NPTextStyles.heading(15, w: FontWeight.w600),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          [
                            if (event?.venueName != null) event!.venueName!,
                            if (event?.startsAt != null)
                              _formatEventDate(event!.startsAt),
                          ].join(' · '),
                          style:
                              NPTextStyles.body(12, color: NPColors.textDim),
                        ),
                        const SizedBox(height: 14),
                        Container(height: 1, color: NPColors.hairline),
                        _row(
                          tier?.name ?? 'Pase',
                          priceCents != null
                              ? _formatMoney(priceCents, currency)
                              : '—',
                        ),
                        Container(height: 1, color: NPColors.hairline),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Total',
                                style: NPTextStyles.heading(14,
                                    w: FontWeight.w600)),
                            Text(
                              priceCents != null
                                  ? _formatMoney(priceCents, currency)
                                  : '—',
                              style: NPTextStyles.display(22,
                                  color: NPColors.magenta),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                if (_errorMessage != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                    child: NPGlass(
                      radius: 14,
                      borderColor: Colors.red.shade400,
                      borderWidth: 1,
                      padding: const EdgeInsets.all(12),
                      child: Text(
                        _errorMessage!,
                        style: NPTextStyles.body(12, color: NPColors.text),
                      ),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                  child: Text(
                    _phaseDescription(),
                    style: NPTextStyles.body(11,
                        color: NPColors.textFaint, height: 1.6),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    NPColors.base.withValues(alpha: 0.92),
                  ],
                  stops: const [0, 0.3],
                ),
              ),
              child: NPPrimary(
                full: true,
                onPressed: _phase == _CheckoutPhase.ready ? _pay : null,
                child: _ctaContent(priceCents, currency),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _ctaContent(int? priceCents, String currency) {
    switch (_phase) {
      case _CheckoutPhase.initializing:
        return const _Loading(text: 'Preparando pago…');
      case _CheckoutPhase.paying:
        return const _Loading(text: 'Procesando…');
      case _CheckoutPhase.awaitingPass:
        return const _Loading(text: 'Generando pase…');
      case _CheckoutPhase.done:
        return const Text('Listo');
      case _CheckoutPhase.ready:
      case _CheckoutPhase.error:
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.lock_outline, size: 14, color: Colors.white),
            const SizedBox(width: 8),
            Text(priceCents != null
                ? 'Pagar ${_formatMoney(priceCents, currency)}'
                : 'Pagar'),
          ],
        );
    }
  }

  String _phaseDescription() {
    switch (_phase) {
      case _CheckoutPhase.initializing:
        return 'Conectando con Stripe…';
      case _CheckoutPhase.ready:
        return 'Al confirmar aceptas los términos del local y la política de NightPass.';
      case _CheckoutPhase.paying:
        return 'No cierres la app durante el pago.';
      case _CheckoutPhase.awaitingPass:
        return 'Pago confirmado. Generando tu pase con QR…';
      case _CheckoutPhase.done:
        return 'Redirigiendo a tu pase…';
      case _CheckoutPhase.error:
        return 'Si el cobro pasó, tu pase aparecerá en la pestaña Pases.';
    }
  }

  Widget _row(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(k, style: NPTextStyles.body(13, color: NPColors.textDim)),
            Text(v, style: NPTextStyles.heading(13, w: FontWeight.w500)),
          ],
        ),
      );
}

class _Loading extends StatelessWidget {
  final String text;
  const _Loading({required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const SizedBox(
          width: 14,
          height: 14,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: Colors.white,
          ),
        ),
        const SizedBox(width: 10),
        Text(text),
      ],
    );
  }
}

String _formatMoney(int cents, String currency) {
  final value = cents / 100;
  final symbol = currency.toUpperCase() == 'MXN'
      ? r'$'
      : currency.toUpperCase() == 'EUR'
          ? '€'
          : currency.toUpperCase() == 'USD'
              ? r'$'
              : '';
  return '$symbol${value.toStringAsFixed(2)} ${currency.toUpperCase()}';
}

String _formatEventDate(DateTime d) {
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ];
  final hh = d.hour.toString().padLeft(2, '0');
  final mm = d.minute.toString().padLeft(2, '0');
  return '${d.day} ${months[d.month - 1]} · $hh:$mm';
}
