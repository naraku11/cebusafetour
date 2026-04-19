import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/meta.dart';
import '../services/meta_service.dart';

// ── MetaNotifier — Auto-binding provider for Dynamic Named Ranges ─────────
// Fetches /api/meta once per session.  Any screen that needs categorical
// values (categories, severities, statuses …) watches this provider instead
// of hardcoding lists.
//
// Usage:
//   final meta = ref.watch(metaProvider).valueOrNull ?? AppMeta.defaults;
//   final categories = meta.attraction.categories;

class MetaNotifier extends AsyncNotifier<AppMeta> {
  @override
  Future<AppMeta> build() => MetaService().fetchMeta();
}

final metaProvider =
    AsyncNotifierProvider<MetaNotifier, AppMeta>(MetaNotifier.new);
