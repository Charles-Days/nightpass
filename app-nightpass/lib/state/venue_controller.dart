import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/venue_api.dart';
import '../models/venue.dart';
import 'auth_controller.dart';

class VenueState {
  final List<Venue> venues;
  final List<Venue> filteredVenues;
  final bool isLoading;
  final String? error;
  final String? searchQuery;
  final String? selectedMusicType;

  const VenueState({
    this.venues = const [],
    this.filteredVenues = const [],
    this.isLoading = false,
    this.error,
    this.searchQuery,
    this.selectedMusicType,
  });

  VenueState copyWith({
    List<Venue>? venues,
    List<Venue>? filteredVenues,
    bool? isLoading,
    String? error,
    String? searchQuery,
    String? selectedMusicType,
    bool clearSearch = false,
    bool clearMusicType = false,
  }) {
    return VenueState(
      venues: venues ?? this.venues,
      filteredVenues: filteredVenues ?? this.filteredVenues,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      searchQuery: clearSearch ? null : (searchQuery ?? this.searchQuery),
      selectedMusicType: clearMusicType ? null : (selectedMusicType ?? this.selectedMusicType),
    );
  }
}

final venueApiProvider = Provider<VenueApi>((ref) {
  return VenueApi(ref.read(apiClientProvider));
});

final venueProvider = StateNotifierProvider<VenueController, VenueState>((ref) {
  return VenueController(api: ref.read(venueApiProvider));
});

class VenueController extends StateNotifier<VenueState> {
  final VenueApi api;

  VenueController({required this.api}) : super(const VenueState()) {
    fetchVenues();
  }

  Future<void> fetchVenues() async {
    state = state.copyWith(isLoading: true);
    try {
      final venues = await api.list();
      state = state.copyWith(
        venues: venues,
        filteredVenues: _applyFilters(venues, state.searchQuery, state.selectedMusicType),
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setSearchQuery(String? query) {
    state = state.copyWith(searchQuery: query);
    state = state.copyWith(
      filteredVenues: _applyFilters(state.venues, query, state.selectedMusicType),
    );
  }

  void setMusicType(String? musicType) {
    // Toggle music type
    final newMusicType = state.selectedMusicType == musicType ? null : musicType;
    state = state.copyWith(
      selectedMusicType: newMusicType,
      clearMusicType: newMusicType == null,
    );
    state = state.copyWith(
      filteredVenues: _applyFilters(state.venues, state.searchQuery, state.selectedMusicType),
    );
  }

  List<Venue> _applyFilters(List<Venue> venues, String? query, String? musicType) {
    return venues.where((v) {
      final matchesQuery = query == null || 
          query.isEmpty || 
          v.name.toLowerCase().contains(query.toLowerCase()) ||
          v.city.toLowerCase().contains(query.toLowerCase());
      
      final matchesMusic = musicType == null || 
          v.musicTypes.any((m) => m.toLowerCase() == musicType.toLowerCase());
      
      return matchesQuery && matchesMusic;
    }).toList();
  }
}
