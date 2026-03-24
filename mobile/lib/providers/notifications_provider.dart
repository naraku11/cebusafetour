import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/app_notification.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';

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

class NotificationsNotifier extends Notifier<NotificationsState> {
  StreamSubscription<RemoteMessage>? _sub;

  @override
  NotificationsState build() {
    // Subscribe to foreground FCM messages
    _sub = NotificationService.messageStream.listen(_onRemoteMessage);
    ref.onDispose(() => _sub?.cancel());
    // Fetch recent announcements from backend
    _fetchPublic();
    return const NotificationsState();
  }

  Future<void> _fetchPublic() async {
    state = state.copyWith(isLoading: true);
    try {
      final res = await ApiService().get('/notifications/public');
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
    // Prepend to list so newest is first
    state = state.copyWith(notifications: [notif, ...state.notifications]);
  }

  void markAllRead() {
    final updated = state.notifications.map((n) => n..isRead = true).toList();
    state = state.copyWith(notifications: updated);
  }

  Future<void> refresh() => _fetchPublic();

}

final notificationsProvider =
    NotifierProvider<NotificationsNotifier, NotificationsState>(
  NotificationsNotifier.new,
);
