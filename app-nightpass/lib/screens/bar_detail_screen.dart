import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_capacity.dart';
import '../widgets/np_chip.dart';
import '../widgets/np_glass.dart';
import '../widgets/np_photo.dart';
import '../models/event.dart';
import '../models/venue.dart';
import '../state/venue_controller.dart';

class BarDetailScreen extends ConsumerStatefulWidget {
  final Venue venue;
  const BarDetailScreen({super.key, required this.venue});

  @override
  ConsumerState<BarDetailScreen> createState() => _BarDetailScreenState();
}

class _BarDetailScreenState extends ConsumerState<BarDetailScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  Venue? _detail;
  bool _loadingDetail = true;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    try {
      final fresh = await ref.read(venueApiProvider).getById(widget.venue.id);
      if (mounted) setState(() { _detail = fresh; _loadingDetail = false; });
    } catch (_) {
      if (mounted) setState(() => _loadingDetail = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final v = _detail ?? widget.venue;
    final photos = [
      if (v.coverImageUrl != null) v.coverImageUrl!,
      ...v.photos.map((p) => p.url),
    ];

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
                  SizedBox(
                    height: 320,
                    child: Stack(
                      children: [
                        if (photos.isEmpty)
                          const NPPhoto(
                            height: 320,
                            hue: 280,
                            borderRadius: BorderRadius.zero,
                          )
                        else
                          PageView.builder(
                            controller: _pageController,
                            onPageChanged: (i) => setState(() => _currentPage = i),
                            itemCount: photos.length,
                            itemBuilder: (context, i) => NPPhoto(
                              imageUrl: photos[i],
                              height: 320,
                              hue: 280,
                              borderRadius: BorderRadius.zero,
                            ),
                          ),
                        Positioned.fill(
                          child: IgnorePointer(
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Colors.black.withValues(alpha: 0.4),
                                    Colors.transparent,
                                    NPColors.base,
                                  ],
                                  stops: const [0.0, 0.30, 1.0],
                                ),
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 56,
                          left: 16,
                          right: 16,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              GestureDetector(
                                onTap: () => context.canPop() ? context.pop() : context.go('/home'),
                                child: _circleBtn(Icons.arrow_back_ios_new_rounded, NPColors.text),
                              ),
                              Row(
                                children: [
                                  _circleBtn(Icons.ios_share_rounded, NPColors.text),
                                  const SizedBox(width: 8),
                                  _circleBtn(Icons.favorite_border, NPColors.text),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Positioned(
                          top: 56,
                          left: 0,
                          right: 0,
                          child: Center(
                            child: NPChip(
                              tone: NPChipTone.live, 
                              child: Text('● OPEN · LIVE · CDMX'),
                            ),
                          ),
                        ),
                        if (photos.length > 1)
                          Positioned(
                            bottom: 70,
                            left: 0,
                            right: 0,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(
                                photos.length,
                                (i) => Container(
                                  width: 6,
                                  height: 6,
                                  margin: const EdgeInsets.symmetric(horizontal: 3),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: _currentPage == i
                                        ? Colors.white
                                        : Colors.white.withValues(alpha: 0.3),
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  Transform.translate(
                    offset: const Offset(0, -60),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(v.name, style: NPTextStyles.display(32, letterSpacing: -0.025)),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.star, size: 14, color: NPColors.warning),
                              const SizedBox(width: 4),
                              Text('4.8 · 1.2k', style: NPTextStyles.body(13, color: NPColors.textDim)),
                              const SizedBox(width: 14),
                              Text('· ${v.categories.join(' · ')}', style: NPTextStyles.body(13, color: NPColors.textDim)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(Icons.location_on_outlined, size: 14, color: NPColors.textDim),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  '${v.address ?? v.city} · 0.4 km',
                                  style: NPTextStyles.body(13, color: NPColors.textDim),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              ...v.musicTypes.map((m) => NPChip(
                                tone: NPChipTone.hero, 
                                child: Text(m.toUpperCase())
                              )),
                              if (v.minAge != null)
                                NPChip(child: Text('${v.minAge}+')),
                              if (v.dressCode != null)
                                NPChip(child: Text(v.dressCode!.toUpperCase())),
                            ],
                          ),
                          const SizedBox(height: 20),
                          if (v.menuUrl != null) ...[
                            NPGhost(
                              full: true,
                              onPressed: () {}, // TODO: Launch menuUrl
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.restaurant_menu_outlined, size: 18),
                                  const SizedBox(width: 10),
                                  const Text('View full menu'),
                                ],
                              ),
                            ),
                            const SizedBox(height: 20),
                          ],
                          NPGlass(
                            radius: 18,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('LIVE CAPACITY', style: NPTextStyles.label(spacing: 0.1)),
                                          const SizedBox(height: 4),
                                          Text('${v.capacity ?? 0}% full · ~12 min wait',
                                              style: NPTextStyles.heading(20, w: FontWeight.w600)),
                                        ],
                                      ),
                                    ),
                                    const NPChip(tone: NPChipTone.live, child: Text('● UPDATING')),
                                  ],
                                ),
                                const SizedBox(height: 14),
                                NPCapacity(pct: v.capacity ?? 0, label: ''),
                                const SizedBox(height: 14),
                                Row(
                                  children: [
                                    Icon(Icons.people_outline, size: 14, color: NPColors.textDim),
                                    const SizedBox(width: 4),
                                    Text('312 / 430', style: NPTextStyles.body(12, color: NPColors.textDim)),
                                    const SizedBox(width: 18),
                                    Icon(Icons.access_time, size: 14, color: NPColors.textDim),
                                    const SizedBox(width: 4),
                                    Text('Open today until 03:00', style: NPTextStyles.body(12, color: NPColors.textDim)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text('Opening Hours', style: NPTextStyles.heading(14, w: FontWeight.w600)),
                          const SizedBox(height: 10),
                          NPGlass(
                            radius: 16,
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                            child: Column(
                              children: _buildHoursRows(v.openHours),
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text('About', style: NPTextStyles.heading(14, w: FontWeight.w600)),
                          const SizedBox(height: 8),
                          Text(
                            v.description ?? 'No description available for this venue.',
                            style: NPTextStyles.body(14, color: NPColors.textDim, height: 1.55),
                          ),
                          const SizedBox(height: 22),
                          if (v.socialLinks != null) ...[
                            Text('Connect', style: NPTextStyles.heading(14, w: FontWeight.w600)),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                if (v.socialLinks!['instagram'] != null)
                                  _socialBtn(Icons.camera_alt_outlined),
                                if (v.socialLinks!['facebook'] != null)
                                  _socialBtn(Icons.facebook),
                                if (v.socialLinks!['website'] != null)
                                  _socialBtn(Icons.language),
                                if (v.phone != null)
                                  _socialBtn(Icons.phone_outlined),
                              ],
                            ),
                            const SizedBox(height: 22),
                          ],
                          Text('Próximos eventos', style: NPTextStyles.heading(14, w: FontWeight.w600)),
                          const SizedBox(height: 10),
                          if (_loadingDetail)
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 12),
                              child: Center(
                                child: SizedBox(
                                  width: 22, height: 22,
                                  child: CircularProgressIndicator(color: NPColors.hero, strokeWidth: 2),
                                ),
                              ),
                            )
                          else if (v.events.isEmpty)
                            NPGlass(
                              radius: 14,
                              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 14),
                              child: Text(
                                'Sin eventos programados.',
                                style: NPTextStyles.body(13, color: NPColors.textDim),
                              ),
                            )
                          else
                            ...v.events.map((e) => Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: _eventTile(e),
                                )),
                          const SizedBox(height: 130),
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
                  colors: [Colors.transparent, NPColors.base.withValues(alpha: 0.92)],
                  stops: const [0, 0.3],
                ),
              ),
              child: NPGlass(
                padding: const EdgeInsets.all(10),
                radius: 20,
                child: Row(
                  children: [
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('COVER FROM', style: NPTextStyles.label(size: 11, spacing: 0.08)),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.baseline,
                              textBaseline: TextBaseline.alphabetic,
                              children: [
                                Text('\$${(v.priceFromCents ?? 0) ~/ 100}', style: NPTextStyles.display(22)),
                                const SizedBox(width: 4),
                                Text('· tonight',
                                    style: NPTextStyles.body(13, color: NPColors.textDim, w: FontWeight.w500)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    NPPrimary(
                      onPressed: () => context.go('/checkout'),
                      child: const Text('Buy cover'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _eventTile(Event e) {
    final local = e.startsAt.toLocal();
    const days = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
    final dayLabel = days[local.weekday - 1];
    final hh = local.hour.toString().padLeft(2, '0');
    final mm = local.minute.toString().padLeft(2, '0');

    int? minPrice;
    String currency = 'MXN';
    for (final t in e.tiers) {
      if (minPrice == null || t.priceCents < minPrice) {
        minPrice = t.priceCents;
        currency = t.currency;
      }
    }
    final priceLabel = minPrice == null
        ? 'Gratis'
        : (currency == 'USD' ? '\$' : '\$') + (minPrice ~/ 100).toString();

    return GestureDetector(
      onTap: () => context.go('/event', extra: e),
      child: NPGlass(
        padding: const EdgeInsets.all(12),
        radius: 14,
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [NPColors.hero, NPColors.magenta],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(dayLabel,
                    style: NPTextStyles.label(color: Colors.white, size: 11, spacing: 0.1)
                        .copyWith(fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(e.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: NPTextStyles.heading(14, w: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text('$hh:$mm · ${local.day}/${local.month}/${local.year % 100}',
                      style: NPTextStyles.body(12, color: NPColors.textDim)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(priceLabel,
                style: NPTextStyles.heading(14, w: FontWeight.w600, color: NPColors.hero)),
          ],
        ),
      ),
    );
  }

  Widget _circleBtn(IconData icon, Color color) {
    return ClipOval(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.45),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
          ),
          child: Center(child: Icon(icon, size: 18, color: color)),
        ),
      ),
    );
  }

  Widget _socialBtn(IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(right: 12),
      child: _circleBtn(icon, NPColors.text),
    );
  }

  List<Widget> _buildHoursRows(Map<String, dynamic>? hours) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    final rows = <Widget>[];

    for (var i = 0; i < days.length; i++) {
      final day = days[i];
      final dayData = hours?[day];
      final isActuallyClosed = dayData == null || 
                              dayData['closed'] == true || 
                              dayData['open'] == null;
      final isOpen = !isActuallyClosed;

      rows.add(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Text(day.substring(0, 3).toUpperCase(),
                  style: NPTextStyles.label(size: 11, spacing: 0.1, color: NPColors.textDim)),
              const Spacer(),
              Text(
                isOpen ? '${dayData['open']} – ${dayData['close']}' : 'CLOSED',
                style: NPTextStyles.body(12, color: isOpen ? NPColors.text : NPColors.textFaint),
              ),
            ],
          ),
        ),
      );
      if (i < days.length - 1) {
        rows.add(Divider(color: Colors.white.withValues(alpha: 0.05), height: 12));
      }
    }

    return rows;
  }
}
