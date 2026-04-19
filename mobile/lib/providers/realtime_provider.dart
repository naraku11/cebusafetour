import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';
import 'advisory_provider.dart';
import 'attractions_provider.dart';
import 'notifications_provider.dart';
import '../services/socket_service.dart';
import '../services/connectivity_service.dart';

/// Manages the Socket.IO connection lifecycle and invalidates Riverpod
/// providers in response to server-push events.
///
/// This provider is watched once at the app root (app.dart) so it stays alive
/// for the entire authenticated session.
///
/// Event → provider mapping
/// ────────────────────────
/// attraction:new / updated / deleted  → attractionsProvider (all family)
/// advisory:new / updated / deleted    → advisoriesProvider
/// advisory:acknowledged               → advisoriesProvider (ack count changed)
/// review:new / deleted                → reviewsProvider(attractionId)
/// notification:new                    → notificationsProvider.refresh()
/// user:updated                        → authProvider (if current user affected)
/// user:profile-updated                → authProvider (own profile refreshed)
///
/// Connectivity
/// ────────────
/// When the device comes back online after a gap, all providers are
/// invalidated so stale data from the offline period is refreshed.
final realtimeProvider = Provider<void>((ref) {
  final token   = ref.watch(authProvider.select((s) => s.token));
  final userId  = ref.read(authProvider).user?.id;

  if (token == null) {
    SocketService.instance.disconnect();
    return;
  }

  // ── Connect ───────────────────────────────────────────────────────────
  SocketService.instance.connect(token);
  final svc = SocketService.instance;

  // ── Attraction events ─────────────────────────────────────────────────
  void onAttractionChange(dynamic _) {
    ref.invalidate(attractionsProvider);
    ref.invalidate(attractionDetailProvider);
    ref.invalidate(nearbyAttractionsProvider);
  }

  svc.on('attraction:new',     onAttractionChange);
  svc.on('attraction:updated', onAttractionChange);
  svc.on('attraction:deleted', onAttractionChange);

  // ── Advisory events ───────────────────────────────────────────────────
  void onAdvisoryChange(dynamic _) => ref.invalidate(advisoriesProvider);

  svc.on('advisory:new',          onAdvisoryChange);
  svc.on('advisory:updated',      onAdvisoryChange);
  svc.on('advisory:deleted',      onAdvisoryChange);
  // Acknowledgement count changed — reload so the badge stays accurate
  svc.on('advisory:acknowledged', onAdvisoryChange);

  // ── Review events ─────────────────────────────────────────────────────
  void onReviewChange(dynamic data) {
    final attractionId = (data is Map) ? data['attractionId']?.toString() : null;
    if (attractionId != null) {
      ref.invalidate(reviewsProvider(attractionId));
      ref.invalidate(attractionDetailProvider(attractionId));
    } else {
      ref.invalidate(attractionsProvider);
    }
  }

  svc.on('review:new',     onReviewChange);
  svc.on('review:deleted', onReviewChange);

  // ── Notification events ───────────────────────────────────────────────
  // FCM handles push delivery; socket event keeps the in-app list in sync.
  void onNotificationNew(dynamic _) {
    ref.read(notificationsProvider.notifier).refresh();
  }

  svc.on('notification:new', onNotificationNew);

  // ── User events ───────────────────────────────────────────────────────
  // When an admin changes this user's status (suspended/banned) or updates
  // their profile, refresh the auth state so the app reflects the change.
  void onUserUpdated(dynamic data) {
    final changedId = (data is Map) ? data['id']?.toString() : null;
    if (changedId != null && changedId == userId) {
      // Re-validate the session — the auth notifier calls /auth/me and
      // handles suspension/ban automatically via its existing flow.
      ref.invalidate(authProvider);
    }
  }

  svc.on('user:updated',         onUserUpdated);
  svc.on('user:profile-updated', onUserUpdated);

  // ── Connectivity reconnect ────────────────────────────────────────────
  // When the device comes back online after being offline, invalidate all
  // providers so they re-fetch potentially stale data.
  final reconnectSub = ConnectivityService.instance.onReconnected.listen((_) {
    ref.invalidate(advisoriesProvider);
    ref.invalidate(attractionsProvider);
    ref.invalidate(attractionDetailProvider);
    ref.invalidate(nearbyAttractionsProvider);
    ref.read(notificationsProvider.notifier).refresh();
  });

  // ── Cleanup ───────────────────────────────────────────────────────────
  ref.onDispose(() {
    reconnectSub.cancel();
    svc
      ..off('attraction:new',      onAttractionChange)
      ..off('attraction:updated',  onAttractionChange)
      ..off('attraction:deleted',  onAttractionChange)
      ..off('advisory:new',        onAdvisoryChange)
      ..off('advisory:updated',    onAdvisoryChange)
      ..off('advisory:deleted',    onAdvisoryChange)
      ..off('advisory:acknowledged', onAdvisoryChange)
      ..off('review:new',          onReviewChange)
      ..off('review:deleted',      onReviewChange)
      ..off('notification:new',    onNotificationNew)
      ..off('user:updated',        onUserUpdated)
      ..off('user:profile-updated',onUserUpdated);
    SocketService.instance.disconnect();
  });
});
