class AppConstants {
  // Production: Hostinger domain where the Node.js backend is deployed
  // Local dev (Android emulator):          'http://10.0.2.2:5000'
  // Local dev (physical device, same Wi-Fi): 'http://YOUR_LOCAL_IP:5000'
  static const String serverUrl = 'https://cebusafetour.fun';
  static const String baseUrl   = '$serverUrl/api';

  static const String appName = 'CebuSafeTour';

  // Fallback emergency contacts used when the API is unreachable
  static const emergencyContacts = [
    {'name': 'PNP Emergency Hotline',             'number': '911'},
    {'name': 'BFP Fire Emergency',                'number': '(032) 255-0911'},
    {'name': 'Philippine Red Cross',              'number': '143'},
    {'name': 'CDRRMO Cebu City',                  'number': '(032) 255-3068'},
    {'name': 'Vicente Sotto Memorial Hospital',   'number': '(032) 253-9891'},
    {'name': 'Chong Hua Hospital (Fuente)',        'number': '(032) 255-8000'},
    {'name': 'Cebu Doctors University Hospital',  'number': '(032) 255-5555'},
    {'name': 'Lapu-Lapu City Police',             'number': '(032) 340-5060'},
    {'name': 'Lapu-Lapu City Fire Station',       'number': '(032) 340-6055'},
    {'name': 'DRRMO Lapu-Lapu City',              'number': '(032) 340-1188'},
    {'name': 'Philippine Coast Guard Cebu',       'number': '(032) 232-7321'},
    {'name': 'PDRRMO Cebu Province',              'number': '(032) 254-3060'},
  ];

  // Only languages with actual translation data in app_localizations.dart
  static const languages = [
    {'code': 'en',  'label': 'English'},
    {'code': 'fil', 'label': 'Filipino'},
    {'code': 'ceb', 'label': 'Cebuano'},
    {'code': 'zh',  'label': '中文 (Chinese)'},
    {'code': 'ko',  'label': '한국어 (Korean)'},
    {'code': 'ja',  'label': '日本語 (Japanese)'},
    {'code': 'ar',  'label': 'العربية (Arabic)'},
    {'code': 'es',  'label': 'Español (Spanish)'},
    {'code': 'fr',  'label': 'Français (French)'},
    {'code': 'de',  'label': 'Deutsch (German)'},
    {'code': 'ru',  'label': 'Русский (Russian)'},
    {'code': 'hi',  'label': 'हिन्दी (Hindi)'},
    {'code': 'th',  'label': 'ภาษาไทย (Thai)'},
    {'code': 'vi',  'label': 'Tiếng Việt (Vietnamese)'},
    {'code': 'id',  'label': 'Bahasa Indonesia'},
    {'code': 'ms',  'label': 'Bahasa Melayu (Malay)'},
  ];
}
