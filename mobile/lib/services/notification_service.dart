import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('Background message: ${message.messageId}');
}

class NotificationService {
  // Broadcast stream — NotificationsNotifier subscribes to receive foreground messages
  static final _controller = StreamController<RemoteMessage>.broadcast();
  static Stream<RemoteMessage> get messageStream => _controller.stream;

  // Set by the app to navigate when a notification is tapped
  static void Function(String route)? _navigator;
  static void setNavigator(void Function(String route) nav) => _navigator = nav;

  static Future<void> initialize() async {
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    await FirebaseMessaging.instance.requestPermission(
      alert: true, badge: true, sound: true,
    );
    await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
      alert: true, badge: true, sound: true,
    );

    // Foreground messages → emit on stream (NotificationsNotifier + in-app banner)
    FirebaseMessaging.onMessage.listen((msg) {
      debugPrint('Foreground FCM: ${msg.notification?.title}');
      _controller.add(msg);
    });

    // App resumed from background by tapping a notification
    FirebaseMessaging.onMessageOpenedApp.listen((msg) {
      _navigator?.call('/notifications');
    });

    // App opened from terminated state via notification tap
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) {
      Future.delayed(const Duration(milliseconds: 600), () {
        _navigator?.call('/notifications');
      });
    }
  }

  static Future<String?> getToken() => FirebaseMessaging.instance.getToken();
}
