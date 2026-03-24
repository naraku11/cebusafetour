class ReviewUser {
  final String id;
  final String name;
  final String? profilePicture;

  ReviewUser({required this.id, required this.name, this.profilePicture});

  factory ReviewUser.fromJson(Map<String, dynamic> json) => ReviewUser(
    id: json['id'],
    name: json['name'],
    profilePicture: json['profilePicture'],
  );
}

class Review {
  final String id;
  final String attractionId;
  final String userId;
  final int rating;
  final String? comment;
  final DateTime createdAt;
  final ReviewUser? user;

  Review({
    required this.id,
    required this.attractionId,
    required this.userId,
    required this.rating,
    this.comment,
    required this.createdAt,
    this.user,
  });

  factory Review.fromJson(Map<String, dynamic> json) => Review(
    id: json['id'],
    attractionId: json['attraction_id'] ?? json['attractionId'] ?? '',
    userId: json['user_id'] ?? json['userId'] ?? '',
    rating: json['rating'] as int,
    comment: json['comment'],
    createdAt: DateTime.parse(json['created_at'] ?? json['createdAt']),
    user: json['user'] != null ? ReviewUser.fromJson(json['user']) : null,
  );
}
