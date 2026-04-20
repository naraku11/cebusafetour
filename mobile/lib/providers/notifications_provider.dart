import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/app_notification.dart';
import '../services/api_service.dart';
import '../services/connectivity_service.dart';

class NotificationsState {
  final List<AppNotification> notifications;
  final bool isLoading;
  final bool hasMore;
  final DateTime? lastReadAt;

  const NotificationsState({
    this.notifications = const [],
    this.isLoading = false,
    this.hasMore = true,
    this.lastReadAt,
  });

  int get unreadCount => notifications.where((n) => !n.isRead).length;

  NotificationsState copyWith({
    List<AppNotification>? notifications,
    bool? isLoading,
    bool? hasMore,
    DateTime? lastReadAt,
  }) => NotificationsState(
    notifications: notifications ?? this.notifications,
    isLoading: isLoading ?? this.isLoading,
    hasMore: hasMore ?? this.hasMore,
    lastReadAt: lastReadAt ?? this.lastReadAt,
  );
}

final _api = ApiService();

class NotificationsNotifier extends Notifier<NotificationsState> {
  StreamSubscription<void>? _connectSub;

  @override
  NotificationsState build() {
    _connectSub = ConnectivityService.instance.onReconnected.listen((_) {
      if (state.notifications.isNotEmpty) refresh();
    });
    ref.onDispose(() => _connectSub?.cancel());
    _fetchPublic();
    return const NotificationsState();
  }

  static const _pageSize = 20;

  Future<void> _fetchPublic({bool loadMore = false}) async {
    if (state.isLoading) return;
    state = state.copyWith(isLoading: true);
    try {
      final before = loadMore && state.notifications.isNotEmpty
          ? state.notifications.last.receivedAt.toUtc().toIso8601String()
          : null;

      final res = await _api.get(
        '/notifications/public',
        params: {'limit': _pageSize, if (before != null) 'before': before},
      );

      final apiList = (res.data['notifications'] as List)
          .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
          .toList();

      final rawLastRead = res.data['lastReadAt'] as String?;
      final lastReadAt  = rawLastRead != null ? DateTime.parse(rawLastRead) : state.lastReadAt;

      if (loadMore) {
        final existingIds = state.notifications.map((n) => n.id).toSet();
        final newItems    = apiList.where((n) => !existingIds.contains(n.id)).toList();
        state = state.copyWith(
          notifications: [...state.notifications, ...newItems],
          isLoading: false,
          hasMore: apiList.length >= _pageSize,
          lastReadAt: lastReadAt,
        );
      } else {
        // Keep socket-only items not yet confirmed by the API
        final apiIds   = apiList.map((n) => n.id).toSet();
        final sockOnly = state.notifications.where((n) => !apiIds.contains(n.id)).toList();
        final merged   = [...apiList, ...sockOnly]
          ..sort((a, b) => b.receivedAt.compareTo(a.receivedAt));
        state = state.copyWith(
          notifications: merged,
          isLoading: false,
          hasMore: apiList.length >= _pageSize,
          lastReadAt: lastReadAt,
        );
      }
    } catch (_) {
      state = state.copyWith(isLoading: false);
    }
  }

  /// Called by realtimeProvider when a socket notification:new event arrives.
  void addFromSocket(AppNotification notif) {
    final already = state.notifications.any((n) => n.id == notif.id);
    if (already) return;
    state = state.copyWith(notifications: [notif, ...state.notifications]);
  }

  Future<void> markAllRead() async {
    final updated = state.notifications.map((n) => n.copyWith(isRead: true)).toList();
    state = state.copyWith(notifications: updated, lastReadAt: DateTime.now());
    await _api.post('/notifications/read').catchError((e) => e as dynamic);
  }

  Future<void> loadMore() => _fetchPublic(loadMore: true);
  Future<void> refresh()  => _fetchPublic();
}

final notificationsProvider =
    NotifierProvider<NotificationsNotifier, NotificationsState>(
  NotificationsNotifier.new,
);

/// Holds the latest notification to show as an in-app popup.
/// Set by realtimeProvider; cleared by app.dart after showing.
class NotificationToastNotifier extends Notifier<AppNotification?> {
  @override
  AppNotification? build() => null;
  void show(AppNotification notif) => state = notif;
  void clear() => state = null;
}

final notificationToastProvider =
    NotifierProvider<NotificationToastNotifier, AppNotification?>(
  NotificationToastNotifier.new,
);
