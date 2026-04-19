import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/advisory.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';

final _api = ApiService();

class AdvisoriesNotifier extends AsyncNotifier<List<Advisory>> {
  @override
  Future<List<Advisory>> build() {
    // Listen to FCM messages so non-logged-in users see updates without a socket
    final sub = NotificationService.messageStream.listen((msg) {
      if (msg.data['type'] == 'advisory') refresh();
    });
    ref.onDispose(sub.cancel);
    return _fetch();
  }

  Future<List<Advisory>> _fetch() async {
    final res = await _api.get('/advisories', params: {'status': 'active', 'limit': '50'});
    final list = res.data['advisories'] as List;
    return list.map((e) => Advisory.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  /// Calls POST /advisories/:id/acknowledge and marks the advisory locally.
  Future<void> acknowledge(String advisoryId, String userId) async {
    try {
      await _api.post('/advisories/$advisoryId/acknowledge');

      // Optimistic local update — add the user to the acknowledgedBy list
      state = state.whenData((list) => list.map((a) {
        if (a.id != advisoryId) return a;
        if (a.isAcknowledgedBy(userId)) return a;
        return a.copyWith(acknowledgedBy: [...a.acknowledgedBy, userId]);
      }).toList());
    } catch (_) {
      // Silently ignore — user can retry by tapping the button again
    }
  }
}

final advisoriesProvider =
    AsyncNotifierProvider<AdvisoriesNotifier, List<Advisory>>(
  AdvisoriesNotifier.new,
);
