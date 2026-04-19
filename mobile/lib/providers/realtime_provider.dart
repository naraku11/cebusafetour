import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';
import 'advisory_provider.dart';
import 'attractions_provider.dart';
import 'notifications_provider.dart';
import '../services/socket_service.dart';

/// Manages the Socket.IO connection lifecycle and invalidates Riverpod
/// providers in response to server-push events.
///
/// This provider is watched once at the app root (e.g. in [app.dart]) so it
/// stays alive for the entire authenticated session.
///
/// Event → provider mapping
/// ────────────────────────
/// attraction:new / updated / deleted  → attractionsProvider (all family)
/// advisory:new   / updated            → advisoriesProvider
/// review:new     / deleted            → reviewsProvider(attractionId)
/// notification:new                    → notificationsProvider (refresh)
///
/// The provider auto-disconnects when the user logs out (token becomes null)
/// and reconnects on the next login without any manual wiring.
final realtimeProvider = Provider<void>((ref) {
  final token = ref.watch(authProvider.select((s) => s.token));

  if (token == null) {
    // Logged out — close the socket immediately
    SocketService.instance.disconnect();
    return;
  }

  // ── Connect ─────────────────────────────────────────────────────────────
  SocketService.instance.connect(token);
  final svc = SocketService.instance;

  // ── Attraction events ───────────────────────────────────────────────────
  void onAttractionChange(dynamic _) {
    // Invalidate every cached family variant so the next navigation re-fetches
    ref.invalidate(attractionsProvider);
    ref.invalidate(attractionDetailProvider);
    ref.invalidate(nearbyAttractionsProvider);
  }

  svc.on('attraction:new',     onAttractionChange);
  svc.on('attraction:updated', onAttractionChange);
  svc.on('attraction:deleted', onAttractionChange);

  // ── Advisory events ─────────────────────────────────────────────────────
  void onAdvisoryChange(dynamic _) => ref.invalidate(advisoriesProvider);

  svc.on('advisory:new',     onAdvisoryChange);
  svc.on('advisory:updated', onAdvisoryChange);
  svc.on('advisory:deleted', onAdvisoryChange);

  // ── Review events ───────────────────────────────────────────────────────
  // The server sends { attractionId } so we can invalidate precisely.
  void onReviewChange(dynamic data) {
    final attractionId = (data is Map) ? data['attractionId']?.toString() : null;
    if (attractionId != null) {
      ref.invalidate(reviewsProvider(attractionId));
      // Rating average on the attraction also changes
      ref.invalidate(attractionDetailProvider(attractionId));
    } else {
      // Fallback: invalidate all attractions
      ref.invalidate(attractionsProvider);
    }
  }

  svc.on('review:new',     onReviewChange);
  svc.on('review:deleted', onReviewChange);

  // ── Notification events ─────────────────────────────────────────────────
  // FCM handles push delivery; socket event triggers a list refresh so the
  // in-app notification centre stays in sync without a manual pull-to-refresh.
  void onNotificationNew(dynamic _) {
    ref.read(notificationsProvider.notifier).refresh();
  }

  svc.on('notification:new', onNotificationNew);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  // Called when the token changes (logout) or the provider is disposed.
  ref.onDispose(() {
    svc
      ..off('attraction:new',     onAttractionChange)
      ..off('attraction:updated', onAttractionChange)
      ..off('attraction:deleted', onAttractionChange)
      ..off('advisory:new',       onAdvisoryChange)
      ..off('advisory:updated',   onAdvisoryChange)
      ..off('review:new',         onReviewChange)
      ..off('review:deleted',     onReviewChange)
      ..off('notification:new',   onNotificationNew);
    SocketService.instance.disconnect();
  });
});
