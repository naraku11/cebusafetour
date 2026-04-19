import 'dart:convert';

class Attraction {
  final String id;
  final String name;
  final String category;
  final String? description;
  final String? district;
  final String? address;
  final double latitude;
  final double longitude;
  final List<String> photos;
  final double entranceFee;
  final String safetyStatus; // safe | caution | restricted
  final String crowdLevel;   // low | moderate | high
  final double averageRating;
  final int totalReviews;
  final Map<String, dynamic> operatingHours;
  final Map<String, dynamic> nearbyFacilities;

  Attraction({
    required this.id,
    required this.name,
    required this.category,
    this.description,
    this.district,
    this.address,
    required this.latitude,
    required this.longitude,
    this.photos = const [],
    this.entranceFee = 0,
    this.safetyStatus = 'safe',
    this.crowdLevel = 'low',
    this.averageRating = 0,
    this.totalReviews = 0,
    this.operatingHours = const {},
    this.nearbyFacilities = const {},
  });

  static List<String> _parseList(dynamic v) {
    if (v == null) return [];
    if (v is String) {
      try { v = jsonDecode(v); } catch (_) { return []; }
    }
    if (v is List) return v.map((e) => e.toString()).toList();
    return [];
  }

  static Map<String, dynamic> _parseMap(dynamic v) {
    if (v == null) return {};
    if (v is String) {
      try { v = jsonDecode(v); } catch (_) { return {}; }
    }
    if (v is Map) return Map<String, dynamic>.from(v);
    return {};
  }

  factory Attraction.fromJson(Map<String, dynamic> json) => Attraction(
    id: json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    category: json['category']?.toString() ?? 'other',
    description: json['description'],
    district: json['district'],
    address: json['address'],
    latitude: double.parse(json['latitude'].toString()),
    longitude: double.parse(json['longitude'].toString()),
    photos: _parseList(json['photos']),
    entranceFee: double.parse((json['entranceFee'] ?? 0).toString()),
    safetyStatus: json['safetyStatus'] ?? 'safe',
    crowdLevel: json['crowdLevel'] ?? 'low',
    averageRating: double.parse((json['averageRating'] ?? 0).toString()),
    totalReviews: json['totalReviews'] ?? 0,
    operatingHours: _parseMap(json['operatingHours']),
    nearbyFacilities: _parseMap(json['nearbyFacilities']),
  );
}
