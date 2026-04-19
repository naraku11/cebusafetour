import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Loaded once at startup (main.dart) from SharedPreferences.
/// Overridden in [ProviderScope] so there is no language flash on cold start.
final initialLanguageProvider = Provider<String>((_) => 'en');

class LanguageNotifier extends Notifier<String> {
  static const _key = 'selected_language';

  @override
  String build() => ref.watch(initialLanguageProvider);

  Future<void> setLanguage(String code) async {
    state = code;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, code);
  }
}

final languageProvider = NotifierProvider<LanguageNotifier, String>(LanguageNotifier.new);

// ── Flag + label data ────────────────────────────────────────────────────────

/// Returns a flag emoji for the given language code, or 🌐 as fallback.
String languageFlag(String code) => _flags[code] ?? '🌐';

/// Returns a short display name for the given language code.
String languageShortName(String code) => _shortNames[code] ?? code.toUpperCase();

const _flags = <String, String>{
  'en':  '🇺🇸',
  'fil': '🇵🇭',
  'ceb': '🇵🇭',
  'zh':  '🇨🇳',
  'ko':  '🇰🇷',
  'ja':  '🇯🇵',
  'ar':  '🇸🇦',
  'es':  '🇪🇸',
  'fr':  '🇫🇷',
  'de':  '🇩🇪',
  'ru':  '🇷🇺',
  'hi':  '🇮🇳',
  'th':  '🇹🇭',
  'vi':  '🇻🇳',
  'id':  '🇮🇩',
  'ms':  '🇲🇾',
};

const _shortNames = <String, String>{
  'en':  'EN',
  'fil': 'FIL',
  'ceb': 'CEB',
  'zh':  '中文',
  'ko':  '한국어',
  'ja':  '日本語',
  'ar':  'العربية',
  'es':  'ES',
  'fr':  'FR',
  'de':  'DE',
  'ru':  'RU',
  'hi':  'हिंदी',
  'th':  'ไทย',
  'vi':  'VI',
  'id':  'ID',
  'ms':  'MS',
};

/// Quick-access languages shown as flag chips on the login screen.
const quickLanguages = [
  ('en',  '🇺🇸', 'English'),
  ('fil', '🇵🇭', 'Filipino'),
  ('zh',  '🇨🇳', '中文'),
  ('ko',  '🇰🇷', '한국어'),
  ('ja',  '🇯🇵', '日本語'),
  ('ar',  '🇸🇦', 'العربية'),
  ('es',  '🇪🇸', 'Español'),
  ('de',  '🇩🇪', 'Deutsch'),
];
