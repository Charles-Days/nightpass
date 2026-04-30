import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_capacity.dart';
import '../widgets/np_chip.dart';
import '../widgets/np_glass.dart';
import '../widgets/np_photo.dart';
import '../state/venue_controller.dart';
import '../models/venue.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final venueState = ref.watch(venueProvider);
    final venues = venueState.venues;

    // Split venues for different sections
    final trending = venues.length > 2 ? venues.sublist(0, 2) : venues;
    final near = venues.length > 2 ? venues.sublist(2) : (venues.isNotEmpty ? [venues.first] : <Venue>[]);

    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          Positioned.fill(
            child: SafeArea(
              bottom: false,
              child: ListView(
                padding: const EdgeInsets.only(top: 12, bottom: 110),
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('TONIGHT · CDMX', style: NPTextStyles.label(size: 12, spacing: 0.08)),
                              const SizedBox(height: 2),
                              Text('Where to?', style: NPTextStyles.display(26)),
                            ],
                          ),
                        ),
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [Color(0xFF3A2356), NPColors.deep],
                            ),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
                    child: Row(
                      children: [
                        NPChip(tone: NPChipTone.live, child: Text('● LIVE · ${venues.length} VENUES OPEN')),
                        const SizedBox(width: 8),
                        const NPChip(tone: NPChipTone.hero, child: Text('21:48')),
                      ],
                    ),
                  ),
                  if (venueState.isLoading)
                    const Padding(
                      padding: EdgeInsets.all(40),
                      child: Center(child: CircularProgressIndicator(color: NPColors.hero)),
                    )
                  else ...[
                    _section('Trending tonight', action: 'See all'),
                    SizedBox(
                      height: 235,
                      child: ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        scrollDirection: Axis.horizontal,
                        itemCount: trending.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 12),
                        itemBuilder: (_, i) {
                          final v = trending[i];
                          return GestureDetector(
                            onTap: () => context.go('/bar', extra: v),
                            child: SizedBox(
                              width: 220,
                              child: NPGlass(
                                padding: EdgeInsets.zero,
                                radius: 20,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    NPPhoto(
                                      imageUrl: v.coverImageUrl,
                                      height: 130,
                                      hue: 280, // Default hue
                                      borderRadius: BorderRadius.zero,
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Text(v.name,
                                                    style: NPTextStyles.heading(16, w: FontWeight.w600)),
                                              ),
                                              NPChip(
                                                tone: (v.capacity ?? 0) > 85 ? NPChipTone.magenta : NPChipTone.live,
                                                fontSize: 10,
                                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                                child: Text('${v.capacity ?? 0}%'),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 2),
                                          Text('${v.categories.take(2).join(' · ')} · ${v.city}',
                                              style: NPTextStyles.body(12, color: NPColors.textDim)),
                                          const SizedBox(height: 8),
                                          Row(
                                            children: [
                                              const Icon(Icons.local_fire_department_outlined,
                                                  size: 14, color: NPColors.hero),
                                              const SizedBox(width: 5),
                                              Text(v.musicTypes.isNotEmpty ? v.musicTypes.first : 'Live Music',
                                                  style: NPTextStyles.body(12, color: NPColors.hero)),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                    _section('Exclusive tonight'),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                      child: GestureDetector(
                        onTap: () => context.go('/event'),
                        child: NPGlass(
                          padding: EdgeInsets.zero,
                          radius: 22,
                          child: Stack(
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  const NPPhoto(
                                    label: 'event.kairos.jpg',
                                    height: 150,
                                    hue: 320,
                                    borderRadius: BorderRadius.zero,
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('KAIROS — opening night',
                                            style: NPTextStyles.heading(18, w: FontWeight.w600)),
                                        const SizedBox(height: 3),
                                        Text('Sat · 23:00 · 200 covers left',
                                            style: NPTextStyles.body(13, color: NPColors.textDim)),
                                        const SizedBox(height: 12),
                                        Row(
                                          children: [
                                            Text('\$450',
                                                style: NPTextStyles.body(11, color: NPColors.textFaint).copyWith(
                                                    decoration: TextDecoration.lineThrough)),
                                            const SizedBox(width: 8),
                                            Text('\$270',
                                                style: NPTextStyles.display(22, color: NPColors.magenta)),
                                            const Spacer(),
                                            Text('View →',
                                                style: NPTextStyles.heading(13, w: FontWeight.w600, color: NPColors.hero)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const Positioned(
                                top: 12,
                                left: 12,
                                child: NPChip(tone: NPChipTone.magenta, child: Text('EXCLUSIVE · 40% OFF')),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    _section('Near you'),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        children: near
                            .map((v) => Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: GestureDetector(
                                    onTap: () => context.go('/bar', extra: v),
                                    child: NPGlass(
                                      padding: const EdgeInsets.all(10),
                                      radius: 16,
                                      child: Row(
                                        children: [
                                          SizedBox(
                                            width: 64,
                                            height: 64,
                                            child: NPPhoto(
                                              imageUrl: v.coverImageUrl,
                                              height: 64,
                                              hue: 280,
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(v.name,
                                                    style: NPTextStyles.heading(15, w: FontWeight.w600)),
                                                const SizedBox(height: 2),
                                                Text('Cover from \$${(v.priceFromCents ?? 0) ~/ 100} · ${v.city}',
                                                    style: NPTextStyles.body(12, color: NPColors.textDim)),
                                                const SizedBox(height: 8),
                                                SizedBox(
                                                  width: 110,
                                                  child: NPCapacity(pct: v.capacity ?? 0, label: ''),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ))
                            .toList(),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  GestureDetector(
                    onTap: () => context.go('/stories'),
                    child: Center(
                      child: Text(
                        'Ver historias en vivo →',
                        style: NPTextStyles.heading(13, w: FontWeight.w600, color: NPColors.hero),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _section(String title, {String? action}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Expanded(child: Text(title, style: NPTextStyles.heading(15, w: FontWeight.w600))),
          if (action != null)
            Text(action, style: NPTextStyles.heading(12, w: FontWeight.w500, color: NPColors.hero)),
        ],
      ),
    );
  }
}
