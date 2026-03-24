import 'package:flutter/material.dart';
import '../models/advisory.dart';
import '../utils/theme.dart';

class AdvisoryCard extends StatelessWidget {
  final Advisory advisory;
  const AdvisoryCard({super.key, required this.advisory});

  Color get _color => switch (advisory.severity) {
    'critical' => AppColors.critical,
    'warning' => AppColors.warning,
    _ => AppColors.advisory,
  };

  String get _icon => switch (advisory.severity) {
    'critical' => '🔴',
    'warning' => '🟡',
    _ => '🟢',
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _color.withValues(alpha: 0.2)),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(_icon, style: const TextStyle(fontSize: 24)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(advisory.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Text(advisory.description, style: const TextStyle(color: Colors.black54, fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(color: _color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
          child: Text(advisory.severity.toUpperCase(), style: TextStyle(color: _color, fontSize: 10, fontWeight: FontWeight.bold)),
        ),
      ]),
    );
  }
}
