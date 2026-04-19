import 'dart:convert';

class Advisory {
  final String id;
  final String title;
  final String description;
  final String severity; // critical | warning | advisory
  final String source;
  final String status;
  final String? recommendedActions;
  final DateTime startDate;
  final DateTime? endDate;
  final List<String> acknowledgedBy;

  Advisory({
    required this.id,
    required this.title,
    required this.description,
    required this.severity,
    required this.source,
    required this.status,
    this.recommendedActions,
    required this.startDate,
    this.endDate,
    this.acknowledgedBy = const [],
  });

  int get acknowledgedCount => acknowledgedBy.length;

  bool isAcknowledgedBy(String userId) => acknowledgedBy.contains(userId);

  Advisory copyWith({List<String>? acknowledgedBy}) => Advisory(
    id: id, title: title, description: description, severity: severity,
    source: source, status: status, recommendedActions: recommendedActions,
    startDate: startDate, endDate: endDate,
    acknowledgedBy: acknowledgedBy ?? this.acknowledgedBy,
  );

  factory Advisory.fromJson(Map<String, dynamic> json) {
    final raw = json['acknowledgedBy'] ?? json['acknowledged_by'];
    List<String> ackList;
    if (raw is List) {
      ackList = raw.map((e) => e.toString()).toList();
    } else if (raw is String && raw.isNotEmpty && raw != 'null') {
      try {
        final decoded = jsonDecode(raw);
        ackList = decoded is List ? decoded.map((e) => e.toString()).toList() : <String>[];
      } catch (_) {
        ackList = <String>[];
      }
    } else {
      ackList = <String>[];
    }

    return Advisory(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      severity: json['severity']?.toString() ?? 'advisory',
      source: json['source']?.toString() ?? '',
      status: json['status']?.toString() ?? 'active',
      recommendedActions: (json['recommendedActions'] ?? json['recommended_actions'])?.toString(),
      startDate: DateTime.tryParse((json['startDate'] ?? json['start_date'] ?? json['created_at'])?.toString() ?? '') ?? DateTime.now(),
      endDate: (json['endDate'] ?? json['end_date']) != null ? DateTime.tryParse((json['endDate'] ?? json['end_date']).toString()) : null,
      acknowledgedBy: ackList,
    );
  }
}
