// ── AppMeta — Dynamic Named Ranges ────────────────────────────────────────
// Mirrors the /api/meta response.  Every categorical value used across the
// app comes from here, eliminating hardcoded lists in screens and widgets.
//
// MetaProvider fetches this once per session and caches it in
// SharedPreferences so the values are available offline on next launch.

class AdvisoryMeta {
  final List<String> severities;
  final List<String> sources;
  final List<String> statuses;

  const AdvisoryMeta({
    required this.severities,
    required this.sources,
    required this.statuses,
  });

  factory AdvisoryMeta.fromJson(Map<String, dynamic> j) => AdvisoryMeta(
    severities: List<String>.from(j['severities'] as List),
    sources:    List<String>.from(j['sources']    as List),
    statuses:   List<String>.from(j['statuses']   as List),
  );
}

class AttractionMeta {
  final List<String> categories;
  final List<String> safetyStatuses;
  final List<String> crowdLevels;
  final List<String> statuses;

  const AttractionMeta({
    required this.categories,
    required this.safetyStatuses,
    required this.crowdLevels,
    required this.statuses,
  });

  factory AttractionMeta.fromJson(Map<String, dynamic> j) => AttractionMeta(
    categories:    List<String>.from(j['categories']    as List),
    safetyStatuses:List<String>.from(j['safetyStatuses'] as List),
    crowdLevels:   List<String>.from(j['crowdLevels']   as List),
    statuses:      List<String>.from(j['statuses']      as List),
  );
}

class NotificationMeta {
  final List<String> types;
  final List<String> priorities;
  final List<String> statuses;

  const NotificationMeta({
    required this.types,
    required this.priorities,
    required this.statuses,
  });

  factory NotificationMeta.fromJson(Map<String, dynamic> j) => NotificationMeta(
    types:      List<String>.from(j['types']      as List),
    priorities: List<String>.from(j['priorities'] as List),
    statuses:   List<String>.from(j['statuses']   as List),
  );
}

class UserMeta {
  final List<String> roles;
  final List<String> staffRoles;
  final List<String> statuses;
  final List<String> languages;

  const UserMeta({
    required this.roles,
    required this.staffRoles,
    required this.statuses,
    required this.languages,
  });

  factory UserMeta.fromJson(Map<String, dynamic> j) => UserMeta(
    roles:      List<String>.from(j['roles']      as List),
    staffRoles: List<String>.from(j['staffRoles'] as List),
    statuses:   List<String>.from(j['statuses']   as List),
    languages:  List<String>.from(j['languages']  as List),
  );
}

class IncidentMeta {
  final List<String> types;
  final List<String> statuses;

  const IncidentMeta({required this.types, required this.statuses});

  factory IncidentMeta.fromJson(Map<String, dynamic> j) => IncidentMeta(
    types:   List<String>.from(j['types']   as List),
    statuses:List<String>.from(j['statuses'] as List),
  );
}

class AppMeta {
  final AdvisoryMeta    advisory;
  final AttractionMeta  attraction;
  final NotificationMeta notification;
  final UserMeta        user;
  final IncidentMeta    incident;

  const AppMeta({
    required this.advisory,
    required this.attraction,
    required this.notification,
    required this.user,
    required this.incident,
  });

  factory AppMeta.fromJson(Map<String, dynamic> j) => AppMeta(
    advisory:     AdvisoryMeta.fromJson(j['advisory']     as Map<String, dynamic>),
    attraction:   AttractionMeta.fromJson(j['attraction'] as Map<String, dynamic>),
    notification: NotificationMeta.fromJson(j['notification'] as Map<String, dynamic>),
    user:         UserMeta.fromJson(j['user']             as Map<String, dynamic>),
    incident:     IncidentMeta.fromJson(j['incident']     as Map<String, dynamic>),
  );

  // Fallback used while the first fetch is in-flight or network is unavailable.
  static const defaults = AppMeta(
    advisory: AdvisoryMeta(
      severities: ['critical', 'warning', 'advisory'],
      sources:    ['pagasa', 'ndrrmc', 'lgu', 'cdrrmo', 'admin'],
      statuses:   ['active', 'resolved', 'archived'],
    ),
    attraction: AttractionMeta(
      categories:    ['beach', 'mountain', 'heritage', 'museum', 'park', 'waterfall', 'market', 'church', 'resort', 'other'],
      safetyStatuses:['safe', 'caution', 'restricted'],
      crowdLevels:   ['low', 'moderate', 'high'],
      statuses:      ['published', 'draft', 'archived'],
    ),
    notification: NotificationMeta(
      types:     ['safety_alert', 'advisory', 'trip_reminder', 'announcement', 'emergency'],
      priorities:['normal', 'high'],
      statuses:  ['pending', 'sent', 'failed'],
    ),
    user: UserMeta(
      roles:      ['tourist', 'admin_super', 'admin_content', 'admin_emergency'],
      staffRoles: ['admin_content', 'admin_emergency'],
      statuses:   ['active', 'suspended', 'banned', 'archived'],
      languages:  ['en', 'fil', 'zh', 'ko', 'ja'],
    ),
    incident: IncidentMeta(
      types:   ['medical', 'fire', 'crime', 'natural_disaster', 'lost_person'],
      statuses:['new', 'in_progress', 'resolved', 'archived'],
    ),
  );
}
