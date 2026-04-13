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
Future<void> _showLocalNotification(RemoteMessage message) async {
  final title = message.notification?.title
      ?? message.data['title'] as String?
      ?? 'CebuSafeTour';
  final body = message.notification?.body
      ?? message.data['body'] as String?
      ?? '';

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
        // Use the app launcher icon; replace with a white-on-transparent
        // @drawable/ic_notification asset for a cleaner Android look.
        icon: '@mipmap/ic_launcher',
      ),
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    ),
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

  static Future<void> initialize() async {
    // ── 1. Register the background handler ──────────────────────────────
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // ── 2. Request OS permission ─────────────────────────────────────────
    await FirebaseMessaging.instance.requestPermission(
      alert: true, badge: true, sound: true,
    );

    // ── 3. iOS foreground presentation — show system banner + sound ──────
    await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
      alert: true, badge: true, sound: true,
    );

    // ── 4. Create the Android notification channel (Android 8.0+) ────────
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

    // ── 5. Initialize flutter_local_notifications ────────────────────────
    await _localNotif.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(
          // Permissions already requested via FirebaseMessaging above.
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
      onDidReceiveNotificationResponse: (NotificationResponse details) {
        // User tapped a local notification → go to the notifications screen.
        _navigator?.call('/notifications');
      },
    );

    // ── 6. Foreground messages ────────────────────────────────────────────
    // Emit to the in-app stream (overlay + list) AND show a system notification
    // so it also appears in the device notification shade.
    FirebaseMessaging.onMessage.listen((msg) {
      debugPrint('Foreground FCM: ${msg.notification?.title}');
      _controller.add(msg);           // in-app overlay / list
      _showLocalNotification(msg);    // system notification bar
    });

    // ── 7. App resumed from background via notification tap ───────────────
    FirebaseMessaging.onMessageOpenedApp.listen((msg) {
      _navigator?.call('/notifications');
    });

    // ── 8. App opened from terminated state via notification tap ──────────
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) {
      Future.delayed(const Duration(milliseconds: 600), () {
        _navigator?.call('/notifications');
      });
    }
  }

  static Future<String?> getToken() => FirebaseMessaging.instance.getToken();
}
