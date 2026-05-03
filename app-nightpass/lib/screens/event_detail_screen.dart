import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../models/event.dart';
import '../screens/checkout_screen.dart' show CheckoutExtra;
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_chip.dart';
import '../widgets/np_glass.dart';
import '../widgets/np_photo.dart';

class EventDetailScreen extends StatefulWidget {
  /// Event real cargado desde el catálogo. Si es null, la pantalla cae a UI demo.
  final Event? eventArg;

  const EventDetailScreen({super.key, this.eventArg});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  int _selected = 0;

  // Demo fallback solo si no llega un Event real
  static const _demoTiers = [
    {'name': 'General', 'desc': 'Standard cover · Open bar 22–23h', 'price': 270, 'left': 184, 'badge': null},
    {'name': 'VIP Lounge', 'desc': 'Reserved area · Premium open bar · Skip line', 'price': 690, 'left': 22, 'badge': 'POPULAR'},
    {'name': 'Penthouse', 'desc': 'Private terrace · Bottle service · 4 ppl', 'price': 4800, 'left': 3, 'badge': null},
  ];

  @override
  Widget build(BuildContext context) {
    final ev = widget.eventArg;
    if (ev != null && ev.tiers.isNotEmpty) {
      return _buildReal(context, ev);
    }
    return _buildDemo(context);
  }

  // ── Versión real conectada al backend ────────────────────────────────────

  Widget _buildReal(BuildContext context, Event ev) {
    final tier = ev.tiers[_selected.clamp(0, ev.tiers.length - 1)];
    final priceLabel = _money(tier.priceCents, tier.currency);

    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          Positioned.fill(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 130),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _hero(context, ev.coverImageUrl),
                  Transform.translate(
                    offset: const Offset(0, -50),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (ev.venueName != null)
                            Text(
                              'AT ${ev.venueName!.toUpperCase()}'
                                  '${ev.venueCity != null ? ' · ${ev.venueCity!.toUpperCase()}' : ''}',
                              style: NPTextStyles.heading(12,
                                      w: FontWeight.w600, color: NPColors.hero)
                                  .copyWith(letterSpacing: 1.5),
                            ),
                          const SizedBox(height: 6),
                          Text(ev.title,
                              style: NPTextStyles.display(30)
                                  .copyWith(height: 1.05)),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              Expanded(
                                child: NPGlass(
                                  padding: const EdgeInsets.all(12),
                                  radius: 14,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text('CUÁNDO',
                                          style: NPTextStyles.label(
                                              size: 10, spacing: 0.1)),
                                      const SizedBox(height: 4),
                                      Text(_dateLabel(ev.startsAt),
                                          style: NPTextStyles.heading(14,
                                              w: FontWeight.w600)),
                                      Text(_timeRange(ev.startsAt, ev.endsAt),
                                          style: NPTextStyles.body(12,
                                              color: NPColors.textDim)),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              if (ev.description != null)
                                Expanded(
                                  child: NPGlass(
                                    padding: const EdgeInsets.all(12),
                                    radius: 14,
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text('SOBRE EL EVENTO',
                                            style: NPTextStyles.label(
                                                size: 10, spacing: 0.1)),
                                        const SizedBox(height: 4),
                                        Text(
                                          ev.description!,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: NPTextStyles.body(12,
                                              color: NPColors.textDim),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 22),
                          Text('Elige tu pase',
                              style: NPTextStyles.heading(14,
                                  w: FontWeight.w600)),
                          const SizedBox(height: 10),
                          ...List.generate(ev.tiers.length, (i) {
                            final t = ev.tiers[i];
                            final on = _selected == i;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: GestureDetector(
                                onTap: () => setState(() => _selected = i),
                                child: NPGlass(
                                  padding: const EdgeInsets.all(14),
                                  radius: 16,
                                  glow: on,
                                  borderColor: on ? NPColors.hero : null,
                                  borderWidth: on ? 1.5 : 1,
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                _radio(on),
                                                const SizedBox(width: 8),
                                                Text(t.name,
                                                    style: NPTextStyles.heading(
                                                        16,
                                                        w: FontWeight.w600)),
                                              ],
                                            ),
                                            if (t.capacity != null) ...[
                                              const SizedBox(height: 6),
                                              Padding(
                                                padding: const EdgeInsets.only(
                                                    left: 26),
                                                child: Text(
                                                  'Cupo ${t.capacity}',
                                                  style: NPTextStyles.label(
                                                    size: 11,
                                                    spacing: 0.04,
                                                    color: NPColors.textFaint,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Text(_money(t.priceCents, t.currency),
                                          style: NPTextStyles.display(18)),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
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
                onPressed: () {
                  context.push(
                    '/checkout?tierId=${tier.id}&eventId=${ev.id}',
                    extra: CheckoutExtra(event: ev, tier: tier),
                  );
                },
                child: Text('Continuar · $priceLabel'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Demo (fallback) ──────────────────────────────────────────────────────

  Widget _buildDemo(BuildContext context) {
    final price = _demoTiers[_selected]['price'] as int;
    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          Positioned.fill(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 130),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _hero(context, null),
                  Transform.translate(
                    offset: const Offset(0, -50),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'AT LUMEN · ROMA NORTE',
                            style: NPTextStyles.heading(12,
                                    w: FontWeight.w600, color: NPColors.hero)
                                .copyWith(letterSpacing: 1.5),
                          ),
                          const SizedBox(height: 6),
                          Text('KAIROS\nopening night',
                              style: NPTextStyles.display(30)
                                  .copyWith(height: 1.05)),
                          const SizedBox(height: 22),
                          Text('Choose your pass',
                              style: NPTextStyles.heading(14,
                                  w: FontWeight.w600)),
                          const SizedBox(height: 10),
                          ...List.generate(_demoTiers.length, (i) {
                            final t = _demoTiers[i];
                            final on = _selected == i;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: GestureDetector(
                                onTap: () => setState(() => _selected = i),
                                child: NPGlass(
                                  padding: const EdgeInsets.all(14),
                                  radius: 16,
                                  glow: on,
                                  borderColor: on ? NPColors.hero : null,
                                  borderWidth: on ? 1.5 : 1,
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                _radio(on),
                                                const SizedBox(width: 8),
                                                Text(t['name'] as String,
                                                    style: NPTextStyles.heading(
                                                        16,
                                                        w: FontWeight.w600)),
                                              ],
                                            ),
                                            const SizedBox(height: 6),
                                            Padding(
                                              padding: const EdgeInsets.only(
                                                  left: 26),
                                              child: Text(
                                                  t['desc'] as String,
                                                  style: NPTextStyles.body(12,
                                                      color: NPColors.textDim,
                                                      height: 1.45)),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Text('\$${t['price']}',
                                          style: NPTextStyles.display(18)),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
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
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Demo — abre un evento real desde Search/Home',
                      ),
                    ),
                  );
                },
                child: Text('Continue · \$$price'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Helpers UI ───────────────────────────────────────────────────────────

  Widget _hero(BuildContext context, String? coverUrl) {
    return SizedBox(
      height: 260,
      child: Stack(
        children: [
          NPPhoto(
            label: coverUrl ?? '',
            height: 260,
            hue: 320,
            borderRadius: BorderRadius.zero,
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.45),
                    Colors.transparent,
                    NPColors.base,
                  ],
                  stops: const [0, 0.35, 1],
                ),
              ),
            ),
          ),
          Positioned(
            top: 56,
            left: 16,
            child: GestureDetector(
              onTap: () =>
                  context.canPop() ? context.pop() : context.go('/home'),
              child: ClipOval(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.45),
                      shape: BoxShape.circle,
                      border: Border.all(
                          color: Colors.white.withValues(alpha: 0.12)),
                    ),
                    child: const Center(
                      child: Icon(Icons.arrow_back_ios_new_rounded,
                          size: 18, color: NPColors.text),
                    ),
                  ),
                ),
              ),
            ),
          ),
          if (widget.eventArg == null)
            const Positioned(
              top: 56,
              right: 16,
              child: NPChip(
                tone: NPChipTone.magenta,
                child: Text('DEMO'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _radio(bool on) {
    return Container(
      width: 18,
      height: 18,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: on ? NPColors.hero : Colors.transparent,
        border: Border.all(
            color: on ? NPColors.hero : Colors.white.withValues(alpha: 0.25),
            width: 1.5),
        boxShadow: on ? [BoxShadow(color: NPColors.hero, blurRadius: 12)] : null,
      ),
      child: on
          ? const Center(
              child: SizedBox(
                width: 6,
                height: 6,
                child: DecoratedBox(
                    decoration: BoxDecoration(
                        color: Colors.white, shape: BoxShape.circle)),
              ),
            )
          : null,
    );
  }
}

// ── Helpers de formato ─────────────────────────────────────────────────────

String _money(int cents, String currency) {
  final value = cents / 100;
  final symbol = currency.toUpperCase() == 'MXN'
      ? r'$'
      : currency.toUpperCase() == 'EUR'
          ? '€'
          : currency.toUpperCase() == 'USD'
              ? r'$'
              : '';
  return '$symbol${value.toStringAsFixed(0)}';
}

String _dateLabel(DateTime d) {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ];
  return '${days[d.weekday - 1]} · ${d.day} ${months[d.month - 1]}';
}

String _timeRange(DateTime a, DateTime b) {
  String fmt(DateTime d) =>
      '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  return '${fmt(a)} — ${fmt(b)}';
}
