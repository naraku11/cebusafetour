import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';
import 'advisory_provider.dart';
import 'attractions_provider.dart';
import 'notifications_provider.dart';
import '../models/app_notification.dart';
import '../services/socket_service.dart';
import '../services/connectivity_service.dart';
import '../services/notification_service.dart';

/// Manages the Socket.IO connection lifecycle and invalidates Riverpod
/// providers in response to server-push events.
///
/// Also shows system notification banners via flutter_local_notifications
/// when events arrive while the app is foregrounded.
final realtimeProvider = Provider<void>((ref) {
  final token   = ref.watch(authProvider.select((s) => s.token));
  final userId  = ref.read(authProvider).user?.id;

  // Keep foreground push handling active even for guest users (no login).
  // Native OS banner is shown via event.notification.display() in NotificationService;
  // in-app we also show the rich custom banner (with map + details for advisories).
  final osSub = NotificationService.foregroundStream.listen((notif) {
    if (token != null) {
      ref.read(notificationsProvider.notifier).addFromSocket(notif);
    }
    ref.read(notificationToastProvider.notifier).show(notif);
  });

  SocketService.instance.connect(token);
  final svc = SocketService.instance;

  if (token != null) {
    // Ensure notification list/unread badge is updated immediately on login.
    // Without this eager fetch, users may wait for a later socket/poll event.
    Future.microtask(() => ref.read(notificationsProvider.notifier).refresh());
  }

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
  void onAdvisoryNew(dynamic data) {
    ref.invalidate(advisoriesProvider);
    if (data is! Map) return;
    final a = data['advisory'];
    if (a is! Map) return;
    final desc = a['description']?.toString() ?? '';
    NotificationService.showRaw(
      id:       a['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      title:    '[${(a['severity'] as String? ?? 'ADVISORY').toUpperCase()}] ${a['title'] ?? 'Advisory'}',
      body:     desc.length > 120 ? desc.substring(0, 120) : desc,
      type:     'advisory',
      severity: a['severity']?.toString(),
    );
  }

  void onAdvisoryChange(dynamic _) => ref.invalidate(advisoriesProvider);

  svc.on('advisory:new',          onAdvisoryNew);
  svc.on('advisory:updated',      onAdvisoryChange);
  svc.on('advisory:deleted',      onAdvisoryChange);
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
  // Backend passes notification + advisory extras in the tourist event.
  // Show a native OS banner and the rich in-app banner (map + details for advisories).
  void onNotificationNew(dynamic data) {
    if (data is Map && data['id'] != null) {
      final notif = AppNotification.fromSocket(Map<String, dynamic>.from(data));
      if (NotificationService.shouldSkipDuplicate(notif.id)) return;
      ref.read(notificationsProvider.notifier).addFromSocket(notif);
      NotificationService.show(notif);
      ref.read(notificationToastProvider.notifier).show(notif);
    } else {
      ref.read(notificationsProvider.notifier).refresh();
    }
  }

  svc.on('notification:new', onNotificationNew);

  if (token == null) {
    ref.onDispose(() {
      osSub.cancel();
      svc.off('notification:new', onNotificationNew);
      SocketService.instance.disconnect();
    });
    return;
  }

  // ── User events ───────────────────────────────────────────────────────
  void onUserUpdated(dynamic data) {
    final changedId = (data is Map) ? data['id']?.toString() : null;
    if (changedId != null && changedId == userId) {
      ref.invalidate(authProvider);
    }
  }

  svc.on('user:updated',         onUserUpdated);
  svc.on('user:profile-updated', onUserUpdated);

  // ── Connectivity reconnect ────────────────────────────────────────────
  final reconnectSub = ConnectivityService.instance.onReconnected.listen((_) {
    ref.invalidate(advisoriesProvider);
    ref.invalidate(attractionsProvider);
    ref.invalidate(attractionDetailProvider);
    ref.invalidate(nearbyAttractionsProvider);
    ref.read(notificationsProvider.notifier).refresh();
  });

  // ── Cleanup ───────────────────────────────────────────────────────────
  ref.onDispose(() {
    osSub.cancel();
    reconnectSub.cancel();
    svc
      ..off('attraction:new',       onAttractionChange)
      ..off('attraction:updated',   onAttractionChange)
      ..off('attraction:deleted',   onAttractionChange)
      ..off('advisory:new',         onAdvisoryNew)
      ..off('advisory:updated',     onAdvisoryChange)
      ..off('advisory:deleted',     onAdvisoryChange)
      ..off('advisory:acknowledged',onAdvisoryChange)
      ..off('review:new',           onReviewChange)
      ..off('review:deleted',       onReviewChange)
      ..off('notification:new',     onNotificationNew)
      ..off('user:updated',         onUserUpdated)
      ..off('user:profile-updated', onUserUpdated);
    SocketService.instance.disconnect();
  });
});
