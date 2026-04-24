import 'package:flutter/material.dart';

abstract class AppToast {
  static const _shape = RoundedRectangleBorder(
    borderRadius: BorderRadius.all(Radius.circular(10)),
  );

  static void success(BuildContext context, String message) =>
      _show(context, message, const Color(0xFF059669), Icons.check_circle_outline);

  static void error(BuildContext context, String message) => _show(
        context,
        message,
        const Color(0xFFDC2626),
        Icons.error_outline,
        duration: const Duration(seconds: 5),
      );

  static void warning(BuildContext context, String message) => _show(
        context,
        message,
        const Color(0xFFF59E0B),
        Icons.warning_amber_rounded,
        duration: const Duration(seconds: 5),
      );

  static void info(BuildContext context, String message) =>
      _show(context, message, const Color(0xFF0284C7), Icons.info_outline);

  static void _show(
    BuildContext context,
    String message,
    Color color,
    IconData icon, {
    Duration duration = const Duration(seconds: 3),
  }) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Row(children: [
        Icon(icon, color: Colors.white, size: 18),
        const SizedBox(width: 8),
        Expanded(
          child: Text(message, style: const TextStyle(color: Colors.white)),
        ),
      ]),
      backgroundColor: color,
      behavior: SnackBarBehavior.floating,
      shape: _shape,
      duration: duration,
    ));
  }
}
