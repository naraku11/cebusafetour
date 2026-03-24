import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../models/trip_plan.dart';
import '../models/attraction.dart';

const _kTripsKey = 'saved_trips_v1';
const _kActiveKey = 'active_trip_id_v1';

class TripPlannerNotifier extends Notifier<TripPlan> {
  bool _mounted = true;

  @override
  TripPlan build() {
    ref.onDispose(() => _mounted = false);
    _loadActive();
    return TripPlan.fresh(const Uuid().v4());
  }

  Future<void> _loadActive() async {
    final prefs = await SharedPreferences.getInstance();
    final activeId = prefs.getString(_kActiveKey);
    if (activeId == null) return;
    final all = await loadAllTrips();
    final match = all.where((t) => t.id == activeId).firstOrNull;
    if (match != null && _mounted) state = match;
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kActiveKey, state.id);
    final all = await loadAllTrips();
    final idx = all.indexWhere((t) => t.id == state.id);
    if (idx >= 0) {
      all[idx] = state;
    } else {
      all.insert(0, state);
    }
    await prefs.setString(_kTripsKey, jsonEncode(all.map((t) => t.toJson()).toList()));
  }

  Future<List<TripPlan>> loadAllTrips() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kTripsKey);
    if (raw == null) return [];
    try {
      return (jsonDecode(raw) as List)
          .map((e) => TripPlan.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> setName(String name) async {
    state = state.copyWith(name: name.trim().isEmpty ? 'My Cebu Trip' : name.trim());
    await _persist();
  }

  Future<void> setDates(DateTime? start, DateTime? end) async {
    state = state.copyWith(startDate: start, endDate: end);
    await _persist();
  }

  Future<void> setTravelers(int n) async {
    state = state.copyWith(travelers: n.clamp(1, 50));
    await _persist();
  }

  Future<void> setNotes(String notes) async {
    state = state.copyWith(notes: notes);
    await _persist();
  }

  Future<void> toggleAttraction(Attraction a) async {
    final has = state.attractions.any((i) => i.id == a.id);
    if (has) {
      state = state.copyWith(
        attractions: state.attractions.where((i) => i.id != a.id).toList(),
      );
    } else {
      state = state.copyWith(
        attractions: [...state.attractions, TripAttraction.fromAttraction(a)],
      );
    }
    await _persist();
  }

  Future<void> removeAttraction(String id) async {
    state = state.copyWith(
      attractions: state.attractions.where((a) => a.id != id).toList(),
    );
    await _persist();
  }

  Future<void> reorder(int oldIndex, int newIndex) async {
    final list = [...state.attractions];
    if (newIndex > oldIndex) newIndex--;
    final item = list.removeAt(oldIndex);
    list.insert(newIndex, item);
    state = state.copyWith(attractions: list);
    await _persist();
  }

  Future<void> assignDay(String attractionId, int? day) async {
    state = state.copyWith(
      attractions: state.attractions
          .map((a) => a.id == attractionId ? a.withDay(day) : a)
          .toList(),
    );
    await _persist();
  }

  Future<void> newTrip() async {
    state = TripPlan.fresh(const Uuid().v4());
    await _persist();
  }

  Future<void> loadTrip(TripPlan plan) async {
    state = plan;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kActiveKey, plan.id);
  }

  Future<void> deleteTrip(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final all = await loadAllTrips();
    final updated = all.where((t) => t.id != id).toList();
    await prefs.setString(
      _kTripsKey,
      jsonEncode(updated.map((t) => t.toJson()).toList()),
    );
    if (state.id == id && _mounted) {
      state = TripPlan.fresh(const Uuid().v4());
      await prefs.setString(_kActiveKey, state.id);
    }
  }
}

final tripProvider =
    NotifierProvider<TripPlannerNotifier, TripPlan>(
  TripPlannerNotifier.new,
);
