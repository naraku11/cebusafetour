import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/attraction.dart';
import '../models/review.dart';
import '../services/api_service.dart';

final _api = ApiService();

/// Parse "key=val&key2=val2" into a Map. Shared by attractions + nearby.
Map<String, dynamic> _parseQuery(String query) {
  final params = <String, dynamic>{};
  for (final part in query.split('&').where((p) => p.isNotEmpty)) {
    final idx = part.indexOf('=');
    if (idx > 0) params[part.substring(0, idx)] = Uri.decodeComponent(part.substring(idx + 1));
  }
  return params;
}

// Key is a URL query string, e.g. "search=foo&category=beach" or "" for no filters.
// Using String (not Map) so Riverpod's family cache works correctly —
// Map does not implement structural equality in Dart.
final attractionsProvider = FutureProvider.family<List<Attraction>, String>((ref, query) async {
  final params = _parseQuery(query);
  final res = await _api.get('/attractions', params: params.isEmpty ? null : params);
  final list = (res.data['attractions'] as List);
  return list.map((e) => Attraction.fromJson(e as Map<String, dynamic>)).toList();
});

final attractionDetailProvider = FutureProvider.family<Attraction, String>((ref, id) async {
  final res = await _api.get('/attractions/$id');
  return Attraction.fromJson(res.data['attraction'] as Map<String, dynamic>);
});

final nearbyAttractionsProvider = FutureProvider.family<List<Attraction>, String>((ref, query) async {
  final params = _parseQuery(query);
  final res = await _api.get('/attractions/nearby', params: params);
  final list = (res.data['attractions'] as List);
  return list.map((e) => Attraction.fromJson(e as Map<String, dynamic>)).toList();
});

// Reviews
final reviewsProvider = FutureProvider.family<List<Review>, String>((ref, attractionId) async {
  final res = await _api.get('/attractions/$attractionId/reviews');
  final list = res.data['reviews'] as List;
  return list.map((e) => Review.fromJson(e as Map<String, dynamic>)).toList();
});

// Submit or update a review. Pass attractionId via notifier, call submit().
class ReviewNotifier extends Notifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncValue.data(null);

  Future<void> submit(String attractionId, int rating, String? comment) async {
    state = const AsyncValue.loading();
    try {
      await _api.post('/attractions/$attractionId/reviews',
          data: {'rating': rating, if (comment != null && comment.isNotEmpty) 'comment': comment});
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> deleteOwn(String attractionId) async {
    state = const AsyncValue.loading();
    try {
      await _api.delete('/attractions/$attractionId/reviews/me');
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final reviewNotifierProvider =
    NotifierProvider.autoDispose<ReviewNotifier, AsyncValue<void>>(
  ReviewNotifier.new,
);
