import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

// ── Notification channels ─────────────────────────────────────────────────
//
//  Heads-up  (cebusafetour_emergency)  IMPORTANCE_MAX
//    Floats over any foreground app, locks screen, triggers vibration.
//    Used for: emergency type, critical severity, priority=high.
//
//  Banner    (cebusafetour_alerts)     IMPORTANCE_HIGH
//    Slides in from the status bar without blocking the screen.
//    Used for: advisories, safety_alert type, warning severity.
//
//  Remote    (cebusafetour_info)       IMPORTANCE_DEFAULT
//    Appears only in the notification drawer — no sound/vibration interruption.
//    Used for: announcements, trip reminders, informational updates.
//
// The FCM default channel (AndroidManifest.xml) is set to cebusafetour_emergency
// so that backend notification-messages that omit android.channel_id are shown
// at maximum importance.  The backend can override per-message by setting
// android.channel_id in the FCM payload.

const _kChHeadsUp     = 'cebusafetour_emergency';
const _kChHeadsUpName = 'Emergency Alerts';
const _kChHeadsUpDesc = 'Critical safety notices — shown as heads-up alerts';

const _kChBanner     = 'cebusafetour_alerts';
const _kChBannerName = 'Safety Advisories';
const _kChBannerDesc = 'Active weather and safety advisories';

const _kChRemote     = 'cebusafetour_info';
const _kChRemoteName = 'General Notifications';
const _kChRemoteDesc = 'Announcements, trip reminders, and updates';

// Notification action identifiers (shown as buttons in the system tray)
const _kActionView    = 'view';
const _kActionDismiss = 'dismiss';

// Shared plugin instance — each isolate initialises its own copy.
final _localNotif = FlutterLocalNotificationsPlugin();

// ── Channel selector ──────────────────────────────────────────────────────
String _channelIdFor(String? type, String? severity, String? priority) {
  if (type == 'emergency' || severity == 'critical' || priority == 'high') {
    return _kChHeadsUp;
  }
  if (type == 'advisory' || type == 'safety_alert' || severity == 'warning') {
    return _kChBanner;
  }
  return _kChRemote;
}

// ── Build platform NotificationDetails for a channel ─────────────────────
NotificationDetails _detailsFor(String channelId, String? type) {
  final isHeadsUp = channelId == _kChHeadsUp;
  final isBanner  = channelId == _kChBanner;

  final channelName = isHeadsUp ? _kChHeadsUpName
      : isBanner    ? _kChBannerName
      :               _kChRemoteName;

  final channelDesc = isHeadsUp ? _kChHeadsUpDesc
      : isBanner    ? _kChBannerDesc
      :               _kChRemoteDesc;

  return NotificationDetails(
    android: AndroidNotificationDetails(
      channelId, channelName,
      channelDescription: channelDesc,
      // Importance.max → floating heads-up card (Android 5+)
      // Importance.high → status-bar banner slide-in
      // Importance.defaultImportance → drawer-only (silent)
      importance: isHeadsUp ? Importance.max
          : isBanner        ? Importance.high
          :                   Importance.defaultImportance,
      priority: isHeadsUp   ? Priority.max
          : isBanner        ? Priority.high
          :                   Priority.defaultPriority,
      icon:            '@mipmap/ic_launcher',
      ticker:          isHeadsUp ? 'Emergency alert' : null,
      // fullScreenIntent shows the notification over the lock screen on Android.
      // Requires USE_FULL_SCREEN_INTENT permission (declared in AndroidManifest).
      fullScreenIntent:  isHeadsUp,
      enableVibration:   isHeadsUp || isBanner,
      playSound:         true,
      groupKey:          'cebusafetour_group',
      // Action buttons visible in the expanded system notification
      actions: (isHeadsUp || isBanner)
          ? const [
              AndroidNotificationAction(
                _kActionView, 'View Details',
                showsUserInterface: true,
              ),
              AndroidNotificationAction(_kActionDismiss, 'Dismiss'),
            ]
          : null,
    ),
    iOS: DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      // interruptionLevel controls iOS Focus / Do Not Disturb behaviour:
      //   timeSensitive — breaks through Focus modes (no entitlement needed)
      //   active        — standard banner (default)
      //   passive       — delivered silently to the notification centre
      interruptionLevel: isHeadsUp ? InterruptionLevel.timeSensitive
          : isBanner               ? InterruptionLevel.active
          :                          InterruptionLevel.passive,
      threadIdentifier: 'cebusafetour_$channelId',
    ),
  );
}

// ── Show a notification in the system tray ───────────────────────────────
Future<void> _showLocalNotification(RemoteMessage message) async {
  final title    = message.notification?.title
      ?? message.data['title']    as String?
      ?? 'CebuSafeTour';
  final body     = message.notification?.body
      ?? message.data['body']     as String?
      ?? '';
  final type     = message.data['type']     as String?;
  final severity = message.data['severity'] as String?;
  final priority = message.data['priority'] as String?;

  final channelId = _channelIdFor(type, severity, priority);

  await _localNotif.show(
    message.hashCode.abs(),
    title, body,
    _detailsFor(channelId, type),
    payload: type,
  );
}

// ── Background / terminated isolate handler ───────────────────────────────
//
// FCM calls this function in a separate Dart isolate when the app is in the
// background or terminated.
//
// Notification messages (message.notification != null):
//   The OS renders them automatically using android.channel_id from the FCM
//   payload, or the default_notification_channel_id in AndroidManifest.xml.
//   We do NOT show a second local notification — that would duplicate it.
//
// Data-only messages (message.notification == null):
//   The OS shows nothing.  We build and show a local notification ourselves,
//   choosing the correct channel from the data payload.
//
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('BG FCM [${message.data["type"]}]: ${message.messageId}');

  // Background isolate has no existing state — must re-initialise the plugin.
  await _localNotif.initialize(
    const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    ),
  );

  if (message.notification == null) {
    await _showLocalNotification(message);
  }
}

// ── NotificationService ───────────────────────────────────────────────────
class NotificationService {
  // Broadcast stream consumed by NotificationsNotifier (in-app list + popup).
  static final _controller = StreamController<RemoteMessage>.broadcast();
  static Stream<RemoteMessage> get messageStream => _controller.stream;

  // Navigation callback set by the app shell.
  static void Function(String route)? _navigator;
  static void setNavigator(void Function(String route) nav) => _navigator = nav;

  // Map FCM message type to the correct in-app route.
  static String _routeFor(RemoteMessage msg) {
    final type = msg.data['type'] as String?;
    if (type == 'advisory' || type == 'safety_alert' || type == 'emergency') {
      return '/advisories';
    }
    return '/notifications';
  }

  static Future<void> initialize() async {
    // 1. Register background handler (must be a top-level function)
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // 2. Request OS notification permission
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      // criticalAlert bypasses DND on iOS but requires an Apple entitlement.
      // Leave false unless the entitlement is provisioned.
    );

    // 3. Subscribe to advisory topic — works without user login
    await FirebaseMessaging.instance.subscribeToTopic('cebu_safety_advisories');

    // 4. Show system notifications while the app is foregrounded (iOS)
    await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
      alert: true, badge: true, sound: true,
    );

    // 5. Create Android notification channels (required on Android 8.0+) ──
    final androidPlugin = _localNotif
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();

    // Heads-up channel: floating card over any app, over the lock screen
    await androidPlugin?.createNotificationChannel(const AndroidNotificationChannel(
      _kChHeadsUp, _kChHeadsUpName,
      description:     _kChHeadsUpDesc,
      importance:      Importance.max,
      playSound:       true,
      enableVibration: true,
      showBadge:       true,
    ));

    // Banner channel: slides in from the status bar
    await androidPlugin?.createNotificationChannel(const AndroidNotificationChannel(
      _kChBanner, _kChBannerName,
      description:     _kChBannerDesc,
      importance:      Importance.high,
      playSound:       true,
      enableVibration: true,
      showBadge:       true,
    ));

    // Remote/info channel: appears in the drawer only — no interruption
    await androidPlugin?.createNotificationChannel(const AndroidNotificationChannel(
      _kChRemote, _kChRemoteName,
      description: _kChRemoteDesc,
      importance:  Importance.defaultImportance,
      playSound:   false,
      showBadge:   true,
    ));

    // 6. Initialise flutter_local_notifications ───────────────────────────
    await _localNotif.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(
          // Permissions are requested at the Firebase level above.
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        if (response.actionId == _kActionDismiss) return;
        final type = response.payload;
        _navigator?.call(
          (type == 'advisory' || type == 'safety_alert' || type == 'emergency')
              ? '/advisories'
              : '/notifications',
        );
      },
    );

    // 7. Foreground FCM messages ──────────────────────────────────────────
    FirebaseMessaging.onMessage.listen((msg) {
      debugPrint('FG FCM [${msg.data["type"]}]: ${msg.notification?.title}');
      _controller.add(msg);         // drives in-app banner + notification list
      _showLocalNotification(msg);  // also posts to the system tray
    });

    // 8. App brought to foreground by tapping a system notification ───────
    FirebaseMessaging.onMessageOpenedApp.listen((msg) {
      _navigator?.call(_routeFor(msg));
    });

    // 9. App launched by tapping a notification from terminated state ──────
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) {
      Future.delayed(const Duration(milliseconds: 600), () {
        _navigator?.call(_routeFor(initial));
      });
    }

    // 10. FCM token refresh — new token is re-registered with the backend
    //     on the user's next login / auth flow.
    FirebaseMessaging.instance.onTokenRefresh.listen((_) {
      debugPrint('FCM token refreshed');
    });
  }

  static Future<String?> getToken() => FirebaseMessaging.instance.getToken();
}
