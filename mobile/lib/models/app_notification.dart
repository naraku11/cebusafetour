import 'package:firebase_messaging/firebase_messaging.dart';

class AppNotification {
  final String id;
  final String title;
  final String body;
  final String type;
  final String priority;
  final DateTime receivedAt;
  bool isRead;

  AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    this.priority = 'normal',
    required this.receivedAt,
    this.isRead = false,
  });

  factory AppNotification.fromRemote(RemoteMessage msg) => AppNotification(
    // Prefer the backend UUID sent in FCM data so deduplication against
    // the /notifications/public API response works correctly.
    id: msg.data['notificationId'] as String?
        ?? msg.messageId
        ?? DateTime.now().millisecondsSinceEpoch.toString(),
    title: msg.notification?.title ?? msg.data['title'] as String? ?? 'Notification',
    body: msg.notification?.body ?? msg.data['body'] as String? ?? '',
    type: msg.data['type'] as String? ?? 'announcement',
    priority: msg.data['priority'] as String? ?? 'normal',
    receivedAt: DateTime.now(),
  );

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
    id: json['id'] as String,
    title: json['title'] as String,
    body: json['body'] as String,
    type: json['type'] as String? ?? 'announcement',
    priority: json['priority'] as String? ?? 'normal',
    receivedAt: DateTime.tryParse(
      json['sentAt'] as String? ?? json['createdAt'] as String? ?? '',
    ) ?? DateTime.now(),
    isRead: json['isRead'] as bool? ?? false,
  );

  AppNotification copyWith({bool? isRead}) => AppNotification(
    id: id, title: title, body: body, type: type, priority: priority,
    receivedAt: receivedAt, isRead: isRead ?? this.isRead,
  );

  /// Whether this notification should show a full-screen emergency overlay
  bool get isEmergency => type == 'emergency';

  /// Whether this notification should show a prominent alert banner
  bool get isCritical => type == 'safety_alert' || priority == 'high';
}
