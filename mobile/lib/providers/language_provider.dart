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
  'tl':  '🇵🇭',
  'zh':  '🇨🇳',
  'ko':  '🇰🇷',
  'ja':  '🇯🇵',
  'ar':  '🇸🇦',
  'es':  '🇪🇸',
  'fr':  '🇫🇷',
  'de':  '🇩🇪',
  'pt':  '🇧🇷',
  'ru':  '🇷🇺',
  'hi':  '🇮🇳',
  'th':  '🇹🇭',
  'vi':  '🇻🇳',
  'id':  '🇮🇩',
  'ms':  '🇲🇾',
  'it':  '🇮🇹',
  'nl':  '🇳🇱',
  'tr':  '🇹🇷',
  'pl':  '🇵🇱',
  'uk':  '🇺🇦',
  'sv':  '🇸🇪',
  'da':  '🇩🇰',
  'no':  '🇳🇴',
  'fi':  '🇫🇮',
  'el':  '🇬🇷',
  'he':  '🇮🇱',
  'bn':  '🇧🇩',
  'ta':  '🇱🇰',
  'ro':  '🇷🇴',
  'hu':  '🇭🇺',
  'cs':  '🇨🇿',
  'sk':  '🇸🇰',
  'hr':  '🇭🇷',
  'bg':  '🇧🇬',
  'sr':  '🇷🇸',
  'lt':  '🇱🇹',
  'lv':  '🇱🇻',
  'et':  '🇪🇪',
  'sl':  '🇸🇮',
  'af':  '🇿🇦',
  'fa':  '🇮🇷',
  'ne':  '🇳🇵',
  'si':  '🇱🇰',
  'ka':  '🇬🇪',
  'hy':  '🇦🇲',
  'az':  '🇦🇿',
  'kk':  '🇰🇿',
  'uz':  '🇺🇿',
  'my':  '🇲🇲',
  'km':  '🇰🇭',
  'lo':  '🇱🇦',
  'mn':  '🇲🇳',
  'sw':  '🇰🇪',
  'ur':  '🇵🇰',
};

const _shortNames = <String, String>{
  'en':  'EN',
  'fil': 'FIL',
  'ceb': 'CEB',
  'tl':  'TL',
  'zh':  '中文',
  'ko':  '한국어',
  'ja':  '日本語',
  'ar':  'العربية',
  'es':  'ES',
  'fr':  'FR',
  'de':  'DE',
  'pt':  'PT',
  'ru':  'RU',
  'hi':  'हिंदी',
  'th':  'ไทย',
  'vi':  'VI',
  'id':  'ID',
  'ms':  'MS',
  'it':  'IT',
  'nl':  'NL',
  'tr':  'TR',
  'pl':  'PL',
  'uk':  'UA',
  'sv':  'SV',
  'da':  'DA',
  'no':  'NO',
  'fi':  'FI',
  'el':  'EL',
  'he':  'עב',
  'bn':  'BN',
  'ta':  'TA',
  'ro':  'RO',
  'hu':  'HU',
  'cs':  'CS',
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
