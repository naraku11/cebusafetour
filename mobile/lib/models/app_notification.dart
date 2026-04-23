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

  factory AppNotification.fromSocket(Map<String, dynamic> data) => AppNotification(
    id: data['id']?.toString()
        ?? DateTime.now().millisecondsSinceEpoch.toString(),
    title: data['title']?.toString() ?? 'Notification',
    body: data['body']?.toString() ?? '',
    type: data['type']?.toString() ?? 'announcement',
    priority: data['priority']?.toString() ?? 'normal',
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

  bool get isEmergency => type == 'emergency';
  bool get isCritical  => type == 'safety_alert' || priority == 'high';
}
