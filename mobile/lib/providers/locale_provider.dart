import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import 'language_provider.dart';

/// Language codes not supported by GlobalMaterialLocalizations.
/// Maps to the nearest supported alternative for the Flutter locale,
/// while AppLocalizations._langOverride keeps translations correct.
const _materialUnsupported = <String, String>{
  'ceb': 'fil', // Cebuano → Filipino (nearest GlobalMaterialLocalizations locale)
};

/// Active locale for the app.
/// Always uses the locally selected language — login never overrides it.
final localeProvider = Provider<Locale>((ref) {
  final langCode = ref.watch(languageProvider);

  final remapped = _materialUnsupported[langCode];
  if (remapped != null) {
    // Remap Flutter locale to avoid MaterialLocalizations crash,
    // but keep our custom translations correct via the static override.
    AppLocalizations.setLangOverride(langCode);
    return Locale(remapped);
  }
  AppLocalizations.setLangOverride(null);
  return Locale(langCode);
});
