import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:go_router/go_router.dart';
import '../models/event.dart';
import '../models/order.dart';
import '../state/orders_providers.dart';
import '../theme/np_theme.dart';
import 'package:dio/dio.dart';
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

enum _CheckoutPhase {
  initializing,
  choosingMethod,
  ready,
  paying,
  awaitingPass,
  done,
  cashForm,
  cashSubmitting,
  cashDone,
  error,
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  _CheckoutPhase _phase = _CheckoutPhase.initializing;
  String? _orderId;
  String? _clientSecret;
  String? _errorMessage;
  final TextEditingController _contact = TextEditingController();

  @override
  void dispose() {
    _contact.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Si el evento acepta pago en efectivo, primero el usuario elige método.
      if (widget.extra?.event?.allowCashPayment == true) {
        setState(() => _phase = _CheckoutPhase.choosingMethod);
      } else {
        _initOrder();
      }
    });
  }

  void _chooseOnline() {
    setState(() {
      _phase = _CheckoutPhase.initializing;
      _errorMessage = null;
    });
    _initOrder();
  }

  void _chooseCash() {
    setState(() {
      _phase = _CheckoutPhase.cashForm;
      _errorMessage = null;
    });
  }

  Future<void> _submitCashRequest() async {
    setState(() {
      _phase = _CheckoutPhase.cashSubmitting;
      _errorMessage = null;
    });
    try {
      final api = ref.read(physicalPaymentsApiProvider);
      await api.createRequest(widget.tierId, contactPhone: _contact.text);
      if (!mounted) return;
      setState(() => _phase = _CheckoutPhase.cashDone);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _phase = _CheckoutPhase.cashForm;
        _errorMessage = _formatError(e);
      });
    }
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
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['message'] != null) {
        return data['message'].toString();
      }
    }
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
                if (_phase == _CheckoutPhase.choosingMethod)
                  _MethodChooser(onOnline: _chooseOnline, onCash: _chooseCash),
                if (_phase == _CheckoutPhase.cashForm ||
                    _phase == _CheckoutPhase.cashSubmitting)
                  _CashForm(controller: _contact),
                if (_phase == _CheckoutPhase.cashDone) const _CashDone(),
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
              child: _bottomCta(priceCents, currency),
            ),
          ),
        ],
      ),
    );
  }

  /// CTA inferior según la fase. Para elección de método no se muestra (los
  /// botones viven en la tarjeta del chooser).
  Widget _bottomCta(int? priceCents, String currency) {
    switch (_phase) {
      case _CheckoutPhase.choosingMethod:
        return const SizedBox.shrink();
      case _CheckoutPhase.cashForm:
        return NPPrimary(
          full: true,
          onPressed: _submitCashRequest,
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.payments_outlined, size: 16, color: Colors.white),
              SizedBox(width: 8),
              Text('Solicitar pago en efectivo'),
            ],
          ),
        );
      case _CheckoutPhase.cashSubmitting:
        return const NPPrimary(
          full: true,
          onPressed: null,
          child: _Loading(text: 'Enviando solicitud…'),
        );
      case _CheckoutPhase.cashDone:
        return NPPrimary(
          full: true,
          onPressed: () => context.go('/home'),
          child: const Text('Entendido'),
        );
      default:
        return NPPrimary(
          full: true,
          onPressed: _phase == _CheckoutPhase.ready ? _pay : null,
          child: _ctaContent(priceCents, currency),
        );
    }
  }

  Widget _ctaContent(int? priceCents, String currency) {
    switch (_phase) {
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
      default:
        return const _Loading(text: 'Preparando pago…');
    }
  }

  String _phaseDescription() {
    switch (_phase) {
      case _CheckoutPhase.initializing:
        return 'Conectando con Stripe…';
      case _CheckoutPhase.choosingMethod:
        return 'Elige cómo quieres pagar tu boleto.';
      case _CheckoutPhase.ready:
        return 'Al confirmar aceptas los términos del local y la política de NightPass.';
      case _CheckoutPhase.paying:
        return 'No cierres la app durante el pago.';
      case _CheckoutPhase.awaitingPass:
        return 'Pago confirmado. Generando tu pase con QR…';
      case _CheckoutPhase.done:
        return 'Redirigiendo a tu pase…';
      case _CheckoutPhase.cashForm:
        return 'El boleto es digital; el cobro lo hace en persona un vendedor (RP). Tu pase se emite cuando confirme el pago.';
      case _CheckoutPhase.cashSubmitting:
        return 'Enviando tu solicitud…';
      case _CheckoutPhase.cashDone:
        return 'Listo. Un vendedor te contactará para cobrarte en efectivo.';
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

/// Elección de método de pago: en línea (Stripe) o en efectivo (vía RP).
class _MethodChooser extends StatelessWidget {
  final VoidCallback onOnline;
  final VoidCallback onCash;
  const _MethodChooser({required this.onOnline, required this.onCash});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
      child: Column(
        children: [
          _MethodCard(
            icon: Icons.credit_card_rounded,
            title: 'Pagar en línea',
            subtitle: 'Tarjeta · tu pase se emite al instante',
            onTap: onOnline,
          ),
          const SizedBox(height: 12),
          _MethodCard(
            icon: Icons.payments_outlined,
            title: 'Pagar en efectivo',
            subtitle: 'Un vendedor (RP) te cobra en persona',
            onTap: onCash,
          ),
        ],
      ),
    );
  }
}

class _MethodCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  const _MethodCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: NPGlass(
        radius: 18,
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: NPColors.hero.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: NPColors.hero, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: NPTextStyles.heading(15, w: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style: NPTextStyles.body(12, color: NPColors.textDim)),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: NPColors.textFaint),
          ],
        ),
      ),
    );
  }
}

/// Formulario mínimo para solicitar pago en efectivo: contacto opcional.
class _CashForm extends StatelessWidget {
  final TextEditingController controller;
  const _CashForm({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
      child: NPGlass(
        radius: 18,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Pago en efectivo',
                style: NPTextStyles.heading(15, w: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(
              'Dejanos un teléfono o WhatsApp (opcional) para que el vendedor te contacte y coordine el cobro.',
              style: NPTextStyles.body(12, color: NPColors.textDim, height: 1.5),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              keyboardType: TextInputType.phone,
              style: NPTextStyles.body(14, color: NPColors.text),
              decoration: InputDecoration(
                hintText: 'Teléfono / WhatsApp (opcional)',
                hintStyle: NPTextStyles.body(13, color: NPColors.textFaint),
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.04),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: NPColors.hairline),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: NPColors.hero),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Confirmación tras solicitar pago en efectivo.
class _CashDone extends StatelessWidget {
  const _CashDone();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
      child: NPGlass(
        radius: 18,
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.14),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_rounded,
                  color: Colors.greenAccent, size: 30),
            ),
            const SizedBox(height: 14),
            Text('Solicitud enviada',
                style: NPTextStyles.heading(17, w: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(
              'Un vendedor (RP) recibió tu solicitud y te contactará para cobrarte en efectivo. Tu pase aparecerá en la pestaña Pases en cuanto confirme el pago.',
              textAlign: TextAlign.center,
              style: NPTextStyles.body(13, color: NPColors.textDim, height: 1.5),
            ),
          ],
        ),
      ),
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
