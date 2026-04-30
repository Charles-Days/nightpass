import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_chip.dart';
import '../widgets/np_glass.dart';
import '../widgets/np_photo.dart';
import '../state/venue_controller.dart';
import '../models/venue.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();

  static const _distance = ['<1km', '1–3km', '3–5km', 'Anywhere'];
  
  // Potential Vibe filters (music types)
  static const _vibes = ['Electronic', 'Reggaeton', 'Pop', 'Jazz', 'Rock', 'Techno'];

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      ref.read(venueProvider.notifier).setSearchQuery(_searchController.text);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final venueState = ref.watch(venueProvider);
    final results = venueState.filteredVenues;

    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          SafeArea(
            bottom: false,
            child: ListView(
              padding: const EdgeInsets.only(top: 6, bottom: 110),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                  child: NPGlass(
                    radius: 14,
                    borderColor: NPColors.hero2,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 0),
                    child: Row(
                      children: [
                        const Icon(Icons.search_rounded, size: 18, color: NPColors.hero),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            style: NPTextStyles.body(15),
                            decoration: InputDecoration(
                              hintText: 'Search bars or cities...',
                              hintStyle: NPTextStyles.body(15, color: NPColors.textDim),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                        if (_searchController.text.isNotEmpty)
                          GestureDetector(
                            onTap: () => _searchController.clear(),
                            child: Icon(Icons.close_rounded, size: 14, color: NPColors.textDim),
                          ),
                      ],
                    ),
                  ),
                ),
                _label('VIBE'),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _vibes.map((vibe) {
                      final on = venueState.selectedMusicType == vibe;
                      return GestureDetector(
                        onTap: () => ref.read(venueProvider.notifier).setMusicType(vibe),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: on ? NPColors.hero.withValues(alpha: 0.18) : Colors.white.withValues(alpha: 0.03),
                            border: Border.all(
                                color: on ? NPColors.hero : Colors.white.withValues(alpha: 0.10)),
                            borderRadius: BorderRadius.circular(999),
                            boxShadow: on
                                ? [
                                    BoxShadow(
                                        color: NPColors.hero.withValues(alpha: 0.5),
                                        blurRadius: 18,
                                        spreadRadius: -4),
                                  ]
                                : null,
                          ),
                          child: Text(
                            vibe,
                            style: NPTextStyles.heading(13, w: FontWeight.w500,
                                color: on ? NPColors.heroSoft : NPColors.text),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                _label('COVER (STATIC)'),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
                  child: NPGlass(
                    radius: 16,
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('\$80', style: NPTextStyles.heading(13)),
                            Text('—', style: NPTextStyles.heading(13, color: NPColors.textDim)),
                            Text('\$400', style: NPTextStyles.heading(13)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          height: 16,
                          child: LayoutBuilder(builder: (_, c) {
                            return Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Positioned(
                                  top: 6,
                                  left: 0,
                                  right: 0,
                                  child: Container(
                                    height: 4,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                  ),
                                ),
                                Positioned(
                                  top: 6,
                                  left: c.maxWidth * 0.15,
                                  width: c.maxWidth * 0.47,
                                  child: Container(
                                    height: 4,
                                    decoration: BoxDecoration(
                                      color: NPColors.hero,
                                      borderRadius: BorderRadius.circular(999),
                                      boxShadow: [BoxShadow(color: NPColors.hero, blurRadius: 12)],
                                    ),
                                  ),
                                ),
                                Positioned(
                                  top: 0,
                                  left: c.maxWidth * 0.13,
                                  child: _knob(),
                                ),
                                Positioned(
                                  top: 0,
                                  left: c.maxWidth * 0.60,
                                  child: _knob(),
                                ),
                              ],
                            );
                          }),
                        ),
                      ],
                    ),
                  ),
                ),
                _label('DISTANCE (STATIC)'),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 22),
                  child: NPGlass(
                    padding: const EdgeInsets.all(8),
                    radius: 16,
                    child: Row(
                      children: List.generate(_distance.length, (i) {
                        final on = i == 1;
                        return Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            margin: const EdgeInsets.symmetric(horizontal: 2),
                            decoration: BoxDecoration(
                              color: on ? NPColors.hero.withValues(alpha: 0.18) : Colors.transparent,
                              border: Border.all(
                                  color: on ? NPColors.hero : Colors.transparent),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Center(
                              child: Text(
                                _distance[i],
                                style: NPTextStyles.heading(12, w: FontWeight.w500,
                                    color: on ? NPColors.heroSoft : NPColors.textDim),
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                  child: Row(
                    children: [
                      Expanded(child: Text('${results.length} RESULTS', style: NPTextStyles.label(spacing: 0.1))),
                      Text('Sort: Trending ↓',
                          style: NPTextStyles.heading(12, w: FontWeight.w600, color: NPColors.hero)),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    children: results
                        .map((v) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: GestureDetector(
                                onTap: () => context.go('/bar', extra: v),
                                child: NPGlass(
                                  padding: const EdgeInsets.all(10),
                                  radius: 14,
                                  child: Row(
                                    children: [
                                      SizedBox(
                                        width: 56,
                                        height: 56,
                                        child: NPPhoto(
                                          imageUrl: v.coverImageUrl,
                                          height: 56,
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
                                                style: NPTextStyles.heading(14, w: FontWeight.w600)),
                                            const SizedBox(height: 2),
                                            Text('${v.categories.take(1).join()} · ${v.city} · 0.4 km',
                                                style: NPTextStyles.body(11, color: NPColors.textDim)),
                                          ],
                                        ),
                                      ),
                                      NPChip(
                                        tone: (v.capacity ?? 0) > 85 ? NPChipTone.magenta : NPChipTone.live,
                                        fontSize: 10,
                                        child: Text('${v.capacity ?? 0}%'),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ))
                        .toList(),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                  child: NPPrimary(
                    full: true, 
                    onPressed: () {}, // No explicit filter application needed as it's real-time
                    child: Text('Apply filters · ${results.length} venues'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
        child: Text(text, style: NPTextStyles.label(spacing: 0.1)),
      );

  Widget _knob() => Container(
        width: 16,
        height: 16,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          border: Border.all(color: NPColors.hero, width: 3),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 8, offset: const Offset(0, 2))],
        ),
      );
}
