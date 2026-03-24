class UserModel {
  final String id;
  final String name;
  final String email;
  final String? nationality;
  final String? contactNumber;
  final String role;
  final String status;
  final String language;
  final bool isVerified;
  final String? profilePicture;
  final bool? profilePictureVerified;
  final List<Map<String, dynamic>> emergencyContacts;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.nationality,
    this.contactNumber,
    required this.role,
    required this.status,
    this.language = 'en',
    this.isVerified = false,
    this.profilePicture,
    this.profilePictureVerified,
    this.emergencyContacts = const [],
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
    id: json['id'],
    name: json['name'],
    email: json['email'],
    nationality: json['nationality'],
    contactNumber: json['contactNumber'],
    role: json['role'] ?? 'tourist',
    status: json['status'] ?? 'active',
    language: json['language'] ?? 'en',
    isVerified: json['isVerified'] ?? false,
    profilePicture: json['profilePicture'],
    profilePictureVerified: json['profilePictureVerified'],
    emergencyContacts: json['emergencyContacts'] is List
        ? List<Map<String, dynamic>>.from(json['emergencyContacts'])
        : [],
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'name': name, 'email': email,
    'nationality': nationality, 'contactNumber': contactNumber,
    'role': role, 'status': status, 'language': language,
    'isVerified': isVerified,
    'profilePicture': profilePicture,
    'profilePictureVerified': profilePictureVerified,
    'emergencyContacts': emergencyContacts,
  };
}
