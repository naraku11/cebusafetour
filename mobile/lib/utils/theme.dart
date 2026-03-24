import 'package:flutter/material.dart';

class AppTheme {
  static const primaryColor = Color(0xFF0EA5E9);
  static const tealColor = Color(0xFF14B8A6);
  static const orangeColor = Color(0xFFF97316);

  static final light = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      primary: primaryColor,
      secondary: tealColor,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: Color(0xFF111827),
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: TextStyle(
        color: Color(0xFF111827),
        fontSize: 18,
        fontWeight: FontWeight.w600,
      ),
    ),
    scaffoldBackgroundColor: const Color(0xFFF9FAFB),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primaryColor, width: 2),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(vertical: 14),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
  );
}

class AppColors {
  static const safe = Color(0xFF10B981);
  static const caution = Color(0xFFF59E0B);
  static const restricted = Color(0xFFEF4444);
  static const critical = Color(0xFFEF4444);
  static const warning = Color(0xFFF59E0B);
  static const advisory = Color(0xFF0EA5E9);
}
