import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'firebase_options.dart';
import 'app.dart';
import 'providers/language_provider.dart';
import 'services/notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  await NotificationService.initialize();

  // Load saved language before first frame to avoid locale flash.
  final prefs = await SharedPreferences.getInstance();
  final savedLang = prefs.getString('selected_language') ?? 'en';

  runApp(ProviderScope(
    overrides: [initialLanguageProvider.overrideWithValue(savedLang)],
    child: const CebuSafeTourApp(),
  ));
}
