import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../models/app_notification.dart';

// ── Notification channels ─────────────────────────────────────────────────
//
//  Heads-up  (cebusafetour_emergency)  IMPORTANCE_MAX
//    Floats over any foreground app; for emergency type, critical severity.
//
//  Banner    (cebusafetour_alerts)     IMPORTANCE_HIGH
//    Slides in from the status bar; for advisories, safety alerts, warnings.
//
//  Remote    (cebusafetour_info)       IMPORTANCE_DEFAULT
//    Appears in the notification drawer only; for general announcements.

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
      channelDescription: isHeadsUp ? _kChHeadsUpDesc : isBanner ? _kChBannerDesc : _kChRemoteDesc,
      importance: isHeadsUp ? Importance.max
          : isBanner        ? Importance.high
          :                   Importance.defaultImportance,
      priority: isHeadsUp   ? Priority.max
          : isBanner        ? Priority.high
          :                   Priority.defaultPriority,
      icon:            '@mipmap/ic_launcher',
      ticker:          isHeadsUp ? 'Emergency alert' : null,
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
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      interruptionLevel: isHeadsUp ? InterruptionLevel.timeSensitive
          : isBanner               ? InterruptionLevel.active
          :                          InterruptionLevel.passive,
      threadIdentifier: 'cebusafetour_$channelId',
    ),
  );
}

class NotificationService {
  static void Function(String route)? _navigator;
  static void setNavigator(void Function(String route) nav) => _navigator = nav;

  static String _routeFor(String? type) {
    if (type == 'advisory' || type == 'safety_alert' || type == 'emergency') {
      return '/advisories';
    }
    return '/notifications';
  }

  static Future<void> initialize() async {
    // 1. Create Android notification channels (required on Android 8.0+)
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

    // 2. Request iOS permission
    await androidPlugin?.requestNotificationsPermission();

    // 3. Initialise plugin — tap handler routes to the correct screen
    await _localNotif.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(
          requestAlertPermission: true,
          requestBadgePermission: true,
          requestSoundPermission: true,
        ),
      ),
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        if (response.actionId == _kActionDismiss) return;
        _navigator?.call(_routeFor(response.payload));
      },
    );
  }

  /// Show a system notification banner for a Socket.IO-delivered event.
  static Future<void> show(AppNotification notif) async {
    final channelId = _channelIdFor(notif.type, null, notif.priority);
    await _localNotif.show(
      notif.id.hashCode.abs() % 2147483647,
      notif.title,
      notif.body,
      _detailsFor(channelId),
      payload: notif.type,
    );
  }

  /// Convenience overload for advisory-style events where severity is known.
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
}
