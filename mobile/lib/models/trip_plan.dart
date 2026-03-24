import '../models/attraction.dart';

class TripAttraction {
  final String id;
  final String name;
  final String category;
  final String safetyStatus;
  final double entranceFee;
  final double latitude;
  final double longitude;
  final String? district;
  final double averageRating;
  final int? dayNumber;

  const TripAttraction({
    required this.id,
    required this.name,
    required this.category,
    required this.safetyStatus,
    required this.entranceFee,
    required this.latitude,
    required this.longitude,
    this.district,
    this.averageRating = 0,
    this.dayNumber,
  });

  TripAttraction withDay(int? day) => TripAttraction(
    id: id, name: name, category: category, safetyStatus: safetyStatus,
    entranceFee: entranceFee, latitude: latitude, longitude: longitude,
    district: district, averageRating: averageRating, dayNumber: day,
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'name': name, 'category': category, 'safetyStatus': safetyStatus,
    'entranceFee': entranceFee, 'latitude': latitude, 'longitude': longitude,
    if (district != null) 'district': district,
    'averageRating': averageRating,
    if (dayNumber != null) 'dayNumber': dayNumber,
  };

  factory TripAttraction.fromJson(Map<String, dynamic> j) => TripAttraction(
    id: j['id'] as String,
    name: j['name'] as String,
    category: j['category'] as String,
    safetyStatus: (j['safetyStatus'] as String?) ?? 'safe',
    entranceFee: (j['entranceFee'] as num?)?.toDouble() ?? 0,
    latitude: (j['latitude'] as num).toDouble(),
    longitude: (j['longitude'] as num).toDouble(),
    district: j['district'] as String?,
    averageRating: (j['averageRating'] as num?)?.toDouble() ?? 0,
    dayNumber: j['dayNumber'] as int?,
  );

  factory TripAttraction.fromAttraction(Attraction a) => TripAttraction(
    id: a.id, name: a.name, category: a.category, safetyStatus: a.safetyStatus,
    entranceFee: a.entranceFee, latitude: a.latitude, longitude: a.longitude,
    district: a.district, averageRating: a.averageRating,
  );
}

class TripPlan {
  final String id;
  final String name;
  final DateTime? startDate;
  final DateTime? endDate;
  final int travelers;
  final List<TripAttraction> attractions;
  final String notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TripPlan({
    required this.id,
    this.name = 'My Cebu Trip',
    this.startDate,
    this.endDate,
    this.travelers = 1,
    this.attractions = const [],
    this.notes = '',
    required this.createdAt,
    required this.updatedAt,
  });

  factory TripPlan.fresh(String id) => TripPlan(
    id: id,
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  );

  int get numDays {
    if (startDate == null || endDate == null) return 0;
    final d = endDate!.difference(startDate!).inDays + 1;
    return d < 1 ? 0 : d;
  }

  double get totalEntranceFee =>
      attractions.fold(0.0, (s, a) => s + a.entranceFee);

  double get totalCost => totalEntranceFee * travelers;

  TripPlan copyWith({
    String? name,
    Object? startDate = _sentinel,
    Object? endDate = _sentinel,
    int? travelers,
    List<TripAttraction>? attractions,
    String? notes,
  }) => TripPlan(
    id: id,
    name: name ?? this.name,
    startDate: startDate == _sentinel ? this.startDate : startDate as DateTime?,
    endDate: endDate == _sentinel ? this.endDate : endDate as DateTime?,
    travelers: travelers ?? this.travelers,
    attractions: attractions ?? this.attractions,
    notes: notes ?? this.notes,
    createdAt: createdAt,
    updatedAt: DateTime.now(),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'startDate': startDate?.toIso8601String(),
    'endDate': endDate?.toIso8601String(),
    'travelers': travelers,
    'attractions': attractions.map((a) => a.toJson()).toList(),
    'notes': notes,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };

  factory TripPlan.fromJson(Map<String, dynamic> j) => TripPlan(
    id: j['id'] as String,
    name: (j['name'] as String?) ?? 'My Cebu Trip',
    startDate: j['startDate'] != null ? DateTime.tryParse(j['startDate'] as String) : null,
    endDate: j['endDate'] != null ? DateTime.tryParse(j['endDate'] as String) : null,
    travelers: (j['travelers'] as int?) ?? 1,
    attractions: (j['attractions'] as List? ?? [])
        .map((e) => TripAttraction.fromJson(e as Map<String, dynamic>))
        .toList(),
    notes: (j['notes'] as String?) ?? '',
    createdAt: j['createdAt'] != null
        ? DateTime.tryParse(j['createdAt'] as String) ?? DateTime.now()
        : DateTime.now(),
    updatedAt: j['updatedAt'] != null
        ? DateTime.tryParse(j['updatedAt'] as String) ?? DateTime.now()
        : DateTime.now(),
  );
}

// Sentinel for copyWith nullable fields
const _sentinel = Object();
