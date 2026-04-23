import 'dart:async';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:onesignal_flutter/onesignal_flutter.dart';
import '../models/app_notification.dart';

// OneSignal App ID — get from https://app.onesignal.com → Your App → Keys & IDs
const _kOneSignalAppId = '9f3a0501-b77f-4306-913b-5ce066ac5b3b';

// ── Android notification channels ─────────────────────────────────────────
//
//  cebusafetour_emergency  IMPORTANCE_MAX   → heads-up floating card
//  cebusafetour_alerts     IMPORTANCE_HIGH  → status-bar banner slide-in
//  cebusafetour_info       IMPORTANCE_DEFAULT → drawer only, silent
//
// These channels are registered on first launch. The correct channel is chosen
// per-notification based on type / severity / priority in the payload.

const _kChHeadsUp     = 'cebusafetour_emergency';
const _kChHeadsUpName = 'Emergency Alerts';
const _kChHeadsUpDesc = 'Critical safety notices — shown as heads-up alerts';

const _kChBanner     = 'cebusafetour_alerts';
const _kChBannerName = 'Safety Advisories';
const _kChBannerDesc = 'Active weather and safety advisories';

const _kChRemote     = 'cebusafetour_info';
const _kChRemoteName = 'General Notifications';
const _kChRemoteDesc = 'Announcements, trip reminders, and updates';

const _kActionView    = 'view';
const _kActionDismiss = 'dismiss';

final _localNotif = FlutterLocalNotificationsPlugin();

String _channelIdFor(String? type, String? severity, String? priority) {
  if (type == 'emergency' || severity == 'critical' || priority == 'high') {
    return _kChHeadsUp;
  }
  if (type == 'advisory' || type == 'safety_alert' || severity == 'warning') {
    return _kChBanner;
  }
  return _kChRemote;
}

NotificationDetails _detailsFor(String channelId) {
  final isHeadsUp = channelId == _kChHeadsUp;
  final isBanner  = channelId == _kChBanner;
  return NotificationDetails(
    android: AndroidNotificationDetails(
      channelId,
      isHeadsUp ? _kChHeadsUpName : isBanner ? _kChBannerName : _kChRemoteName,
      channelDescription: isHeadsUp ? _kChHeadsUpDesc
          : isBanner ? _kChBannerDesc : _kChRemoteDesc,
      importance: isHeadsUp ? Importance.max
          : isBanner        ? Importance.high
          :                   Importance.defaultImportance,
      priority: isHeadsUp   ? Priority.max
          : isBanner        ? Priority.high
          :                   Priority.defaultPriority,
      icon:             '@mipmap/ic_launcher',
      ticker:           isHeadsUp ? 'Emergency alert' : null,
      fullScreenIntent: isHeadsUp,
      enableVibration:  isHeadsUp || isBanner,
      playSound:        true,
      groupKey:         'cebusafetour_group',
      actions: (isHeadsUp || isBanner)
          ? const [
              AndroidNotificationAction(_kActionView, 'View Details', showsUserInterface: true),
              AndroidNotificationAction(_kActionDismiss, 'Dismiss'),
            ]
          : null,
    ),
    iOS: DarwinNotificationDetails(
      presentAlert: true, presentBadge: true, presentSound: true,
      interruptionLevel: isHeadsUp ? InterruptionLevel.timeSensitive
          : isBanner               ? InterruptionLevel.active
          :                          InterruptionLevel.passive,
      threadIdentifier: 'cebusafetour_$channelId',
    ),
  );
}

class NotificationService {
  // Broadcast stream — realtimeProvider subscribes to trigger in-app popup + list update.
  // Fires when OneSignal delivers a notification while the app is foregrounded.
  static final _foregroundCtrl = StreamController<AppNotification>.broadcast();
  static Stream<AppNotification> get foregroundStream => _foregroundCtrl.stream;
  static final Map<String, DateTime> _recentNotificationIds = {};
  static const Duration _dedupeWindow = Duration(seconds: 20);

  static void Function(String route)? _navigator;
  static void setNavigator(void Function(String route) nav) => _navigator = nav;

  static String _routeFor(String? type) =>
      (type == 'advisory' || type == 'safety_alert' || type == 'emergency')
          ? '/advisories'
          : '/notifications';

  static bool shouldSkipDuplicate(String id) {
    final now = DateTime.now();
    _recentNotificationIds.removeWhere(
      (_, ts) => now.difference(ts) > _dedupeWindow,
    );
    final seenAt = _recentNotificationIds[id];
    if (seenAt != null && now.difference(seenAt) <= _dedupeWindow) {
      return true;
    }
    _recentNotificationIds[id] = now;
    return false;
  }

  static Future<void> initialize() async {
    // 1. Create Android notification channels (must run before any notification)
    final androidPlugin = _localNotif
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();

    await androidPlugin?.createNotificationChannel(const AndroidNotificationChannel(
      _kChHeadsUp, _kChHeadsUpName,
      description: _kChHeadsUpDesc, importance: Importance.max,
      playSound: true, enableVibration: true, showBadge: true,
    ));
    await androidPlugin?.createNotificationChannel(const AndroidNotificationChannel(
      _kChBanner, _kChBannerName,
      description: _kChBannerDesc, importance: Importance.high,
      playSound: true, enableVibration: true, showBadge: true,
    ));
    await androidPlugin?.createNotificationChannel(const AndroidNotificationChannel(
      _kChRemote, _kChRemoteName,
      description: _kChRemoteDesc, importance: Importance.defaultImportance,
      playSound: false, showBadge: true,
    ));

    // 2. Initialise flutter_local_notifications (handles tap → navigate)
    await _localNotif.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false, // OneSignal handles this
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        if (response.actionId == _kActionDismiss) return;
        _navigator?.call(_routeFor(response.payload));
      },
    );
    await androidPlugin?.requestNotificationsPermission();

    // 3. Initialise OneSignal
    OneSignal.initialize(_kOneSignalAppId);
    await OneSignal.Notifications.requestPermission(true);

    // 4. Foreground handler — display the native OS banner (same as background)
    //    and propagate to in-app listeners for list updates.
    OneSignal.Notifications.addForegroundWillDisplayListener((event) {
      final n    = event.notification;
      final data = Map<String, dynamic>.from(n.additionalData ?? {});
      final normalizedId = (data['notificationId']?.toString().trim().isNotEmpty == true)
          ? data['notificationId'].toString()
          : (n.notificationId ?? DateTime.now().millisecondsSinceEpoch.toString());
      if (shouldSkipDuplicate(normalizedId)) return;

      // Show the native OS notification banner (required in OneSignal v5 foreground).
      event.notification.display();

      final notif = AppNotification(
        id:        normalizedId,
        title:     n.title ?? 'CebuSafeTour',
        body:      n.body ?? '',
        type:      data['type']     as String? ?? 'announcement',
        priority:  data['priority'] as String? ?? 'normal',
        receivedAt: DateTime.now(),
      );
      // Notify subscribers — realtimeProvider updates notification list only.
      _foregroundCtrl.add(notif);
    });

    // 5. Tap handler — routes to correct screen from system tray
    OneSignal.Notifications.addClickListener((event) {
      final type = (event.notification.additionalData ?? {})['type'] as String?;
      _navigator?.call(_routeFor(type));
    });
  }

  /// Show a system notification using the correct importance channel.
  /// Using the same numeric ID for the same notification.id replaces any
  /// existing system notification (prevents duplicates).
  static Future<void> show(AppNotification notif) async {
    final channelId = _channelIdFor(notif.type, null, notif.priority);
    await _localNotif.show(
      notif.id.hashCode.abs() % 2147483647,
      notif.title, notif.body,
      _detailsFor(channelId),
      payload: notif.type,
    );
  }

  /// Overload for advisory-style events where severity is known.
  static Future<void> showRaw({
    required String id,
    required String title,
    required String body,
    String? type,
    String? severity,
    String? priority,
  }) async {
    final channelId = _channelIdFor(type, severity, priority);
    await _localNotif.show(
      id.hashCode.abs() % 2147483647,
      title, body,
      _detailsFor(channelId),
      payload: type,
    );
  }

  /// Called after login — maps this device to the user for targeted pushes.
  static void loginUser(String userId, {String? nationality}) {
    OneSignal.login(userId);
    if (nationality != null && nationality.isNotEmpty) {
      OneSignal.User.addTags({'nationality': nationality});
    }
  }

  /// Called after logout — removes user mapping.
  static void logoutUser() {
    OneSignal.logout();
  }
}
