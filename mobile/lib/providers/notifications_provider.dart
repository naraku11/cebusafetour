import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/app_notification.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';
import '../services/connectivity_service.dart';

class NotificationsState {
  final List<AppNotification> notifications;
  final bool isLoading;

  const NotificationsState({
    this.notifications = const [],
    this.isLoading = false,
  });

  int get unreadCount => notifications.where((n) => !n.isRead).length;

  NotificationsState copyWith({List<AppNotification>? notifications, bool? isLoading}) =>
      NotificationsState(
        notifications: notifications ?? this.notifications,
        isLoading: isLoading ?? this.isLoading,
      );
}

final _api = ApiService();

class NotificationsNotifier extends Notifier<NotificationsState> {
  StreamSubscription<RemoteMessage>? _fcmSub;
  StreamSubscription<void>? _connectSub;

  @override
  NotificationsState build() {
    // Subscribe to foreground FCM messages — prepends them to the list
    _fcmSub = NotificationService.messageStream.listen(_onRemoteMessage);

    // Subscribe to connectivity-restored events — refresh after a network gap
    _connectSub = ConnectivityService.instance.onReconnected.listen((_) {
      // Only refresh if we already have data (avoids double-fetch on first load)
      if (state.notifications.isNotEmpty) refresh();
    });

    // Cancel both subscriptions when the provider is disposed
    ref.onDispose(() {
      _fcmSub?.cancel();
      _connectSub?.cancel();
    });

    // Fetch initial list of announcements from the backend
    _fetchPublic();
    return const NotificationsState();
  }

  Future<void> _fetchPublic() async {
    state = state.copyWith(isLoading: true);
    try {
      final res = await _api.get('/notifications/public');
      final list = (res.data['notifications'] as List)
          .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
          .toList();
      state = state.copyWith(notifications: list, isLoading: false);
    } catch (_) {
      state = state.copyWith(isLoading: false);
    }
  }

  void _onRemoteMessage(RemoteMessage msg) {
    final notif = AppNotification.fromRemote(msg);
    // Prepend so newest is first; deduplicate by id to guard against FCM
    // delivering the same message twice on flaky connections.
    final already = state.notifications.any((n) => n.id == notif.id);
    if (already) return;
    state = state.copyWith(notifications: [notif, ...state.notifications]);
  }

  void markAllRead() {
    final updated = state.notifications.map((n) => n.copyWith(isRead: true)).toList();
    state = state.copyWith(notifications: updated);
  }

  Future<void> refresh() => _fetchPublic();
}

final notificationsProvider =
    NotifierProvider<NotificationsNotifier, NotificationsState>(
  NotificationsNotifier.new,
);
