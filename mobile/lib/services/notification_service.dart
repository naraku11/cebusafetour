import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

// ─── Android notification channel ─────────────────────────────────────────
// The channel ID must match the value declared in AndroidManifest.xml under
//   com.google.firebase.messaging.default_notification_channel_id
// so that FCM background/terminated notifications also use this channel.
const _kChannelId   = 'cebusafetour_alerts';
const _kChannelName = 'CebuSafeTour Alerts';
const _kChannelDesc = 'Safety alerts, emergency notices, and trip reminders';

// Single shared plugin instance — safe to call from both the main isolate
// and the background isolate (they each initialize their own copy).
final _localNotif = FlutterLocalNotificationsPlugin();

// ─── Show a notification in the system notification bar ───────────────────
// payload carries the FCM data type so tap-routing works correctly.
Future<void> _showLocalNotification(RemoteMessage message) async {
  final title = message.notification?.title
      ?? message.data['title'] as String?
      ?? 'CebuSafeTour';
  final body = message.notification?.body
      ?? message.data['body'] as String?
      ?? '';
  final type = message.data['type'] as String?;

  await _localNotif.show(
    message.hashCode.abs(),
    title,
    body,
    const NotificationDetails(
      android: AndroidNotificationDetails(
        _kChannelId,
        _kChannelName,
        channelDescription: _kChannelDesc,
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
      ),
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    ),
    payload: type,
  );
}

// ─── Background / terminated handler (separate isolate) ───────────────────
// FCM shows notification-messages automatically when the app is in the
// background on Android.  Data-only messages get nothing from the OS —
// we must call flutter_local_notifications ourselves.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('Background FCM: ${message.messageId}');

  if (message.notification == null) {
    // Data-only message — OS won't show anything; show it manually.
    await _localNotif.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
    );
    await _showLocalNotification(message);
  }
}

// ─── Service class ─────────────────────────────────────────────────────────
class NotificationService {
  // Broadcast stream — NotificationsNotifier subscribes to receive foreground
  // messages for the in-app list and popup overlay.
  static final _controller = StreamController<RemoteMessage>.broadcast();
  static Stream<RemoteMessage> get messageStream => _controller.stream;

  // Set by the app shell so notification taps can navigate to /notifications.
  static void Function(String route)? _navigator;
  static void setNavigator(void Function(String route) nav) => _navigator = nav;

  // Returns the correct deep-link route for a given FCM message.
  static String _routeFor(RemoteMessage msg) {
    final type = msg.data['type'] as String?;
    if (type == 'advisory') return '/advisories';
    return '/notifications';
  }

  static Future<void> initialize() async {
    // ── 1. Register the background handler ──────────────────────────────
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // ── 2. Request OS permission ─────────────────────────────────────────
    await FirebaseMessaging.instance.requestPermission(
      alert: true, badge: true, sound: true,
    );

    // ── 3. Subscribe to the advisory topic — receives push even without login
    await FirebaseMessaging.instance.subscribeToTopic('cebu_safety_advisories');

    // ── 4. iOS foreground presentation — show system banner + sound ──────
    await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
      alert: true, badge: true, sound: true,
    );

    // ── 5. Create the Android notification channel (Android 8.0+) ────────
    await _localNotif
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(const AndroidNotificationChannel(
          _kChannelId,
          _kChannelName,
          description: _kChannelDesc,
          importance: Importance.high,
          playSound: true,
        ));

    // ── 6. Initialize flutter_local_notifications ────────────────────────
    await _localNotif.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
      onDidReceiveNotificationResponse: (NotificationResponse details) {
        // Payload carries the FCM data type so we can route correctly.
        final type = details.payload;
        _navigator?.call(type == 'advisory' ? '/advisories' : '/notifications');
      },
    );

    // ── 7. Foreground messages ────────────────────────────────────────────
    FirebaseMessaging.onMessage.listen((msg) {
      debugPrint('Foreground FCM: ${msg.notification?.title}');
      _controller.add(msg);
      _showLocalNotification(msg);
    });

    // ── 8. App resumed from background via notification tap ───────────────
    FirebaseMessaging.onMessageOpenedApp.listen((msg) {
      _navigator?.call(_routeFor(msg));
    });

    // ── 9. App opened from terminated state via notification tap ──────────
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) {
      Future.delayed(const Duration(milliseconds: 600), () {
        _navigator?.call(_routeFor(initial));
      });
    }
  }

  static Future<String?> getToken() => FirebaseMessaging.instance.getToken();
}
