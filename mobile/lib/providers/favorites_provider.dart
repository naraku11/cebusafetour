import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/attraction.dart';

const _kKey = 'saved_attractions_v1';

class FavoritesNotifier extends Notifier<List<Attraction>> {
  @override
  List<Attraction> build() {
    _load();
    return [];
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kKey);
    if (raw == null) return;
    try {
      final list = (jsonDecode(raw) as List)
          .map((e) => Attraction.fromJson(e as Map<String, dynamic>))
          .toList();
      state = list;
    } catch (_) {}
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _kKey,
      jsonEncode(state.map(_attractionToJson).toList()),
    );
  }

  bool isSaved(String id) => state.any((a) => a.id == id);

  Future<void> toggle(Attraction attraction) async {
    if (isSaved(attraction.id)) {
      state = state.where((a) => a.id != attraction.id).toList();
    } else {
      state = [...state, attraction];
    }
    await _save();
  }
}

Map<String, dynamic> _attractionToJson(Attraction a) => {
  'id': a.id,
  'name': a.name,
  'category': a.category,
  'description': a.description,
  'district': a.district,
  'address': a.address,
  'latitude': a.latitude,
  'longitude': a.longitude,
  'photos': a.photos,
  'entranceFee': a.entranceFee,
  'safetyStatus': a.safetyStatus,
  'crowdLevel': a.crowdLevel,
  'averageRating': a.averageRating,
  'totalReviews': a.totalReviews,
  'operatingHours': a.operatingHours,
  'nearbyFacilities': a.nearbyFacilities,
};

final favoritesProvider =
    NotifierProvider<FavoritesNotifier, List<Attraction>>(
  FavoritesNotifier.new,
);
