import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/advisory_provider.dart';
import '../../models/advisory.dart';
import '../../utils/theme.dart';
import '../../widgets/emergency_fab.dart';

class AdvisoriesScreen extends ConsumerWidget {
  const AdvisoriesScreen({super.key});

  Color _severityColor(String s) => switch (s) {
    'critical' => AppColors.critical,
    'warning' => AppColors.warning,
    _ => AppColors.advisory,
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final advisories = ref.watch(advisoriesProvider);
    final l = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l.safetyAdvisories)),
      body: Stack(children: [
        advisories.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Error: $e')),
          data: (list) => list.isEmpty
            ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Text('🎉', style: TextStyle(fontSize: 48)),
                const SizedBox(height: 12),
                Text(l.noActiveAdvisories.replaceAll(' 🎉', ''), style: const TextStyle(fontSize: 16, color: Colors.grey)),
                Text(l.cebuIsSafe, style: const TextStyle(color: Colors.grey)),
              ]))
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (ctx, i) => _AdvisoryCard(advisory: list[i], l: l),
              ),
        ),
        const Positioned(bottom: 24, right: 24, child: EmergencyFab()),
      ]),
    );
  }
}

class _AdvisoryCard extends StatelessWidget {
  final Advisory advisory;
  final AppLocalizations l;
  const _AdvisoryCard({required this.advisory, required this.l});

  Color get _color => switch (advisory.severity) {
    'critical' => AppColors.critical,
    'warning' => AppColors.warning,
    _ => AppColors.advisory,
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _color.withValues(alpha: 0.3)),
        boxShadow: [BoxShadow(color: _color.withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Text(advisory.severity == 'critical' ? '🔴' : advisory.severity == 'warning' ? '🟡' : '🟢', style: const TextStyle(fontSize: 28)),
        title: Text(advisory.title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SizedBox(height: 4),
          Text(advisory.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13)),
          const SizedBox(height: 6),
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: _color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
              child: Text(advisory.severity.toUpperCase(), style: TextStyle(color: _color, fontSize: 11, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 8),
            Text(DateFormat('MMM d, yyyy').format(advisory.startDate), style: const TextStyle(color: Colors.grey, fontSize: 11)),
          ]),
        ]),
        onTap: () => _showDetail(context),
      ),
    );
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        expand: false,
        builder: (_, ctrl) => SingleChildScrollView(
          controller: ctrl,
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            Text(advisory.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(advisory.description, style: const TextStyle(height: 1.5)),
            if (advisory.recommendedActions != null) ...[
              const SizedBox(height: 16),
              Text(l.recommendedActions, style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(advisory.recommendedActions!, style: const TextStyle(height: 1.5, color: Colors.black87)),
            ],
          ]),
        ),
      ),
    );
  }
}
