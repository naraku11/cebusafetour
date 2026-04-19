import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/advisory_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/advisory.dart';
import '../../utils/theme.dart';
import '../../widgets/emergency_fab.dart';

class AdvisoriesScreen extends ConsumerWidget {
  const AdvisoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final advisories = ref.watch(advisoriesProvider);
    final userId = ref.watch(authProvider).user?.id ?? '';
    final l = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.safetyAdvisories),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () => ref.read(advisoriesProvider.notifier).refresh(),
            tooltip: l.refresh,
          ),
        ],
      ),
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
                itemBuilder: (ctx, i) => _AdvisoryCard(advisory: list[i], userId: userId, l: l),
              ),
        ),
        const Positioned(bottom: 24, right: 24, child: EmergencyFab()),
      ]),
    );
  }
}

class _AdvisoryCard extends StatelessWidget {
  final Advisory advisory;
  final String userId;
  final AppLocalizations l;
  const _AdvisoryCard({required this.advisory, required this.userId, required this.l});

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
            const Spacer(),
            if (advisory.isAcknowledgedBy(userId)) ...[
              Icon(Icons.check_circle, size: 14, color: Colors.green.shade500),
              const SizedBox(width: 3),
              Text('You acknowledged', style: TextStyle(fontSize: 10, color: Colors.green.shade600, fontWeight: FontWeight.w500)),
            ],
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
      builder: (ctx) => _AdvisoryDetailSheet(advisory: advisory, userId: userId, l: l),
    );
  }
}

class _AdvisoryDetailSheet extends ConsumerWidget {
  final Advisory advisory;
  final String userId;
  final AppLocalizations l;
  const _AdvisoryDetailSheet({required this.advisory, required this.userId, required this.l});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch so the button reflects optimistic acknowledge updates
    final current = ref.watch(advisoriesProvider).value
        ?.firstWhere((a) => a.id == advisory.id, orElse: () => advisory)
        ?? advisory;

    final acknowledged = current.isAcknowledgedBy(userId);
    final color = switch (current.severity) {
      'critical' => AppColors.critical,
      'warning'  => AppColors.warning,
      _          => AppColors.advisory,
    };

    return DraggableScrollableSheet(
      initialChildSize: 0.65,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      expand: false,
      builder: (_, ctrl) => SingleChildScrollView(
        controller: ctrl,
        padding: const EdgeInsets.all(24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 16),

          // Severity badge + count
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
              child: Text(current.severity.toUpperCase(), style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
            ),
            const Spacer(),
            Icon(Icons.people_outline, size: 16, color: Colors.grey.shade500),
            const SizedBox(width: 4),
            Text('${current.acknowledgedCount} acknowledged', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          ]),
          const SizedBox(height: 12),

          Text(current.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(current.description, style: const TextStyle(height: 1.5)),

          if (current.recommendedActions != null) ...[
            const SizedBox(height: 16),
            Text(l.recommendedActions, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(current.recommendedActions!, style: const TextStyle(height: 1.5, color: Colors.black87)),
          ],

          const SizedBox(height: 28),

          // Acknowledge button
          SizedBox(
            width: double.infinity,
            child: acknowledged
                ? Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.green.shade200),
                    ),
                    child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(Icons.check_circle, color: Colors.green.shade600, size: 20),
                      const SizedBox(width: 8),
                      Text('Acknowledged', style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.w600)),
                    ]),
                  )
                : ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: color,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: const Icon(Icons.check, size: 20),
                    label: const Text('I Understand', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                    onPressed: userId.isEmpty ? null : () {
                      ref.read(advisoriesProvider.notifier).acknowledge(current.id, userId);
                    },
                  ),
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }
}
