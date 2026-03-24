import 'package:flutter/material.dart';
import '../utils/theme.dart';

class SafetyBadge extends StatelessWidget {
  final String status;
  final bool small;
  const SafetyBadge({super.key, required this.status, this.small = false});

  Color get _color => switch (status) {
    'safe' => AppColors.safe,
    'caution' => AppColors.caution,
    'restricted' => AppColors.restricted,
    _ => Colors.grey,
  };

  String get _label => switch (status) {
    'safe' => '🟢 Safe',
    'caution' => '🟡 Caution',
    'restricted' => '🔴 Restricted',
    _ => status,
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: small ? 8 : 10, vertical: small ? 2 : 4),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _color.withValues(alpha: 0.3)),
      ),
      child: Text(_label, style: TextStyle(color: _color, fontSize: small ? 10 : 12, fontWeight: FontWeight.w600)),
    );
  }
}
