import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import '../models/meta.dart';

// ── MetaService ───────────────────────────────────────────────────────────
// Fetches /api/meta and caches the result in SharedPreferences so the named
// ranges are available immediately on next launch without a network round-trip.
//
// On failure (no network, server error) it falls back to the cached response,
// then to AppMeta.defaults — the app always has valid ranges to bind to.

class MetaService {
  static const _kCacheKey = 'app_meta_v1';

  final _api = ApiService();

  Future<AppMeta> fetchMeta() async {
    try {
      final res  = await _api.get('/meta');
      final json = res.data as Map<String, dynamic>;
      final meta = AppMeta.fromJson(json);
      // Persist for offline / cold-start use
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kCacheKey, jsonEncode(json));
      return meta;
    } catch (_) {
      return await _cached() ?? AppMeta.defaults;
    }
  }

  Future<AppMeta?> _cached() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw   = prefs.getString(_kCacheKey);
      if (raw == null) return null;
      return AppMeta.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }
}
