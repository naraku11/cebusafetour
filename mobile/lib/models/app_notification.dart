class AppNotification {
  final String id;
  final String title;
  final String body;
  final String type;
  final String priority;
  final DateTime receivedAt;
  bool isRead;

  // Advisory-specific extras (null for non-advisory types)
  final String?  locationName;
  final double?  lat;
  final double?  lng;
  final String?  severity;
  final String?  source;
  final String?  recommendedActions;

  AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    this.priority = 'normal',
    required this.receivedAt,
    this.isRead = false,
    this.locationName,
    this.lat,
    this.lng,
    this.severity,
    this.source,
    this.recommendedActions,
  });

  factory AppNotification.fromSocket(Map<String, dynamic> data) => AppNotification(
    id: data['id']?.toString()
        ?? DateTime.now().millisecondsSinceEpoch.toString(),
    title:    data['title']?.toString()    ?? 'Notification',
    body:     data['body']?.toString()     ?? '',
    type:     data['type']?.toString()     ?? 'announcement',
    priority: data['priority']?.toString() ?? 'normal',
    receivedAt: DateTime.now(),
    locationName:       data['locationName']?.toString(),
    lat:                (data['lat'] as num?)?.toDouble(),
    lng:                (data['lng'] as num?)?.toDouble(),
    severity:           data['severity']?.toString(),
    source:             data['source']?.toString(),
    recommendedActions: data['recommendedActions']?.toString(),
  );

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
    id:    json['id'] as String,
    title: json['title'] as String,
    body:  json['body'] as String,
    type:  json['type'] as String? ?? 'announcement',
    priority: json['priority'] as String? ?? 'normal',
    receivedAt: DateTime.tryParse(
      json['sentAt'] as String? ?? json['createdAt'] as String? ?? '',
    ) ?? DateTime.now(),
    isRead: json['isRead'] as bool? ?? false,
    locationName:       json['locationName']?.toString(),
    lat:                (json['lat'] as num?)?.toDouble(),
    lng:                (json['lng'] as num?)?.toDouble(),
    severity:           json['severity']?.toString(),
    source:             json['source']?.toString(),
    recommendedActions: json['recommendedActions']?.toString(),
  );

  AppNotification copyWith({bool? isRead}) => AppNotification(
    id: id, title: title, body: body, type: type, priority: priority,
    receivedAt: receivedAt, isRead: isRead ?? this.isRead,
    locationName: locationName, lat: lat, lng: lng,
    severity: severity, source: source,
    recommendedActions: recommendedActions,
  );

  bool get isEmergency => type == 'emergency';
  bool get isCritical  => type == 'safety_alert' || priority == 'high';
  bool get isAdvisory  => type == 'advisory' || type == 'safety_alert';
}
