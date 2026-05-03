import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../models/pass.dart';
import '../state/orders_providers.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_chip.dart';
import '../widgets/np_glass.dart';

class PassScreen extends ConsumerStatefulWidget {
  /// Si viene `passId`, muestra el detalle de ese pase. Si no, lista mis pases.
  final String? passId;

  const PassScreen({super.key, this.passId});

  @override
  ConsumerState<PassScreen> createState() => _PassScreenState();
}

class _PassScreenState extends ConsumerState<PassScreen> {
  late Future<dynamic> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<dynamic> _load() {
    final api = ref.read(passesApiProvider);
    if (widget.passId != null && widget.passId!.isNotEmpty) {
      return api.getById(widget.passId!);
    }
    return api.listMine();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          SafeArea(
            child: FutureBuilder<dynamic>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(
                    child: CircularProgressIndicator(color: NPColors.hero),
                  );
                }
                if (snapshot.hasError) {
                  return _ErrorBlock(
                    message: snapshot.error.toString(),
                    onRetry: () => setState(() => _future = _load()),
                  );
                }

                final data = snapshot.data;
                if (data is Pass) {
                  return _PassDetail(pass: data);
                }
                if (data is List<Pass>) {
                  if (data.isEmpty) return const _EmptyState();
                  return _PassList(
                    passes: data,
                    onTap: (p) => context.push('/pass-detail?passId=${p.id}'),
                  );
                }
                return const _EmptyState();
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Detalle individual ────────────────────────────────────────────────────

class _PassDetail extends StatelessWidget {
  final Pass pass;
  const _PassDetail({required this.pass});

  @override
  Widget build(BuildContext context) {
    final used = pass.isUsed;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 130),
      children: [
        Row(
          children: [
            GestureDetector(
              onTap: () =>
                  context.canPop() ? context.pop() : context.go('/pass'),
              child: const Icon(Icons.arrow_back_ios_new_rounded,
                  size: 20, color: NPColors.text),
            ),
            const SizedBox(width: 14),
            Text('Mi pase', style: NPTextStyles.display(22)),
          ],
        ),
        const SizedBox(height: 24),
        NPGlass(
          radius: 22,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          pass.eventTitle ?? 'Evento',
                          style:
                              NPTextStyles.heading(18, w: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          [
                            if (pass.tierName != null) pass.tierName!,
                            if (pass.venueName != null) pass.venueName!,
                            if (pass.eventStartsAt != null)
                              _date(pass.eventStartsAt!),
                          ].join(' · '),
                          style:
                              NPTextStyles.body(12, color: NPColors.textDim),
                        ),
                      ],
                    ),
                  ),
                  NPChip(
                    tone: used ? NPChipTone.magenta : NPChipTone.hero,
                    child: Text(used ? 'USADO' : 'ACTIVO'),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: QrImageView(
                  data: pass.qrCode,
                  version: QrVersions.auto,
                  size: 240,
                  backgroundColor: Colors.white,
                  eyeStyle: const QrEyeStyle(
                    eyeShape: QrEyeShape.square,
                    color: Colors.black,
                  ),
                  dataModuleStyle: const QrDataModuleStyle(
                    dataModuleShape: QrDataModuleShape.square,
                    color: Colors.black,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                pass.id.split('-').first.toUpperCase(),
                style: NPTextStyles.heading(13,
                        w: FontWeight.w600, color: NPColors.textDim)
                    .copyWith(letterSpacing: 2.5),
              ),
              if (used && pass.usedAt != null) ...[
                const SizedBox(height: 8),
                Text(
                  'Escaneado: ${_dateTime(pass.usedAt!)}',
                  style: NPTextStyles.body(11, color: NPColors.magenta),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (pass.venueAddress != null)
          NPGlass(
            radius: 14,
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                const Icon(Icons.location_on_outlined,
                    size: 18, color: NPColors.hero),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    pass.venueAddress!,
                    style: NPTextStyles.body(12, color: NPColors.text),
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 16),
        NPGhost(
          onPressed: () => context.go('/pass'),
          child: const Text('Ver todos mis pases'),
        ),
      ],
    );
  }
}

// ── Lista de pases ────────────────────────────────────────────────────────

class _PassList extends StatelessWidget {
  final List<Pass> passes;
  final void Function(Pass) onTap;

  const _PassList({required this.passes, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 130),
      itemCount: passes.length + 1,
      itemBuilder: (context, i) {
        if (i == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text('Mis pases', style: NPTextStyles.display(26)),
          );
        }
        final p = passes[i - 1];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: GestureDetector(
            onTap: () => onTap(p),
            child: NPGlass(
              radius: 16,
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p.eventTitle ?? 'Evento',
                          style:
                              NPTextStyles.heading(15, w: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          [
                            if (p.venueName != null) p.venueName!,
                            if (p.eventStartsAt != null)
                              _date(p.eventStartsAt!),
                          ].join(' · '),
                          style:
                              NPTextStyles.body(12, color: NPColors.textDim),
                        ),
                      ],
                    ),
                  ),
                  NPChip(
                    tone: p.isUsed ? NPChipTone.magenta : NPChipTone.hero,
                    child: Text(p.isUsed ? 'USADO' : 'ACTIVO'),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.confirmation_number_outlined,
                size: 56, color: NPColors.hero),
            const SizedBox(height: 12),
            Text('Aún no tienes pases',
                style: NPTextStyles.heading(18, w: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(
              'Cuando compres un pase aparecerá aquí con su QR.',
              textAlign: TextAlign.center,
              style: NPTextStyles.body(13, color: NPColors.textDim),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorBlock extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorBlock({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: NPColors.magenta),
            const SizedBox(height: 12),
            Text('No pudimos cargar tus pases',
                style: NPTextStyles.heading(16, w: FontWeight.w600),
                textAlign: TextAlign.center),
            const SizedBox(height: 6),
            Text(message,
                style: NPTextStyles.body(11, color: NPColors.textFaint),
                textAlign: TextAlign.center),
            const SizedBox(height: 14),
            NPGhost(onPressed: onRetry, child: const Text('Reintentar')),
          ],
        ),
      ),
    );
  }
}

String _date(DateTime d) {
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ];
  return '${d.day} ${months[d.month - 1]}';
}

String _dateTime(DateTime d) {
  final hh = d.hour.toString().padLeft(2, '0');
  final mm = d.minute.toString().padLeft(2, '0');
  return '${_date(d)} · $hh:$mm';
}
