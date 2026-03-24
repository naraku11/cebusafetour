import 'package:firebase_messaging/firebase_messaging.dart';

class AppNotification {
  final String id;
  final String title;
  final String body;
  final String type;
  final DateTime receivedAt;
  bool isRead;

  AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.receivedAt,
    this.isRead = false,
  });

  factory AppNotification.fromRemote(RemoteMessage msg) => AppNotification(
    id: msg.messageId ?? DateTime.now().millisecondsSinceEpoch.toString(),
    title: msg.notification?.title ?? 'Notification',
    body: msg.notification?.body ?? '',
    type: msg.data['type'] ?? 'announcement',
    receivedAt: DateTime.now(),
  );

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
    id: json['id'] as String,
    title: json['title'] as String,
    body: json['body'] as String,
    type: json['type'] as String? ?? 'announcement',
    receivedAt: DateTime.parse(json['sentAt'] as String? ?? json['createdAt'] as String),
  );
}
