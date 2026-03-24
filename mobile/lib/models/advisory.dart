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
    id: json['id'],
    title: json['title'],
    description: json['description'],
    severity: json['severity'],
    source: json['source'],
    status: json['status'],
    recommendedActions: json['recommendedActions'],
    startDate: DateTime.parse(json['startDate']),
    endDate: json['endDate'] != null ? DateTime.parse(json['endDate']) : null,
  );
}
