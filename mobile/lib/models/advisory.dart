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
  });

  factory Advisory.fromJson(Map<String, dynamic> json) => Advisory(
    id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
    title: json['title']?.toString() ?? '',
    description: json['description']?.toString() ?? '',
    severity: json['severity']?.toString() ?? 'advisory',
    source: json['source']?.toString() ?? '',
    status: json['status']?.toString() ?? 'active',
    recommendedActions: (json['recommendedActions'] ?? json['recommended_actions'])?.toString(),
    startDate: DateTime.tryParse((json['startDate'] ?? json['start_date'] ?? json['created_at'])?.toString() ?? '') ?? DateTime.now(),
    endDate: (json['endDate'] ?? json['end_date']) != null ? DateTime.tryParse((json['endDate'] ?? json['end_date']).toString()) : null,
  );
}
