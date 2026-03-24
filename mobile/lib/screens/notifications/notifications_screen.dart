import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/notifications_provider.dart';
import '../../models/app_notification.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(notificationsProvider.notifier).markAllRead();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationsProvider);
    final l = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.notifications),
        actions: [
          if (state.notifications.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.refresh_outlined),
              onPressed: () => ref.read(notificationsProvider.notifier).refresh(),
              tooltip: l.refresh,
            ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.notifications.isEmpty
              ? _EmptyState(l: l)
              : RefreshIndicator(
                  onRefresh: () => ref.read(notificationsProvider.notifier).refresh(),
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: state.notifications.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
                    itemBuilder: (ctx, i) => _NotificationTile(n: state.notifications[i], l: l),
                  ),
                ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification n;
  final AppLocalizations l;
  const _NotificationTile({required this.n, required this.l});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      leading: CircleAvatar(
        backgroundColor: _typeColor(n.type).withValues(alpha: 0.12),
        child: Icon(_typeIcon(n.type), color: _typeColor(n.type), size: 20),
      ),
      title: Text(n.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 2),
          Text(n.body, style: const TextStyle(fontSize: 13, color: Colors.black87), maxLines: 3, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 4),
          Text(_timeAgo(n.receivedAt, l), style: const TextStyle(fontSize: 11, color: Colors.grey)),
        ],
      ),
      isThreeLine: true,
    );
  }

  IconData _typeIcon(String type) {
    switch (type) {
      case 'emergency':     return Icons.emergency_outlined;
      case 'safety_alert':  return Icons.warning_amber_outlined;
      case 'advisory':      return Icons.info_outlined;
      case 'trip_reminder': return Icons.map_outlined;
      default:              return Icons.campaign_outlined;
    }
  }

  Color _typeColor(String type) {
    switch (type) {
      case 'emergency':     return Colors.red;
      case 'safety_alert':  return Colors.orange;
      case 'advisory':      return Colors.amber;
      case 'trip_reminder': return const Color(0xFF14B8A6);
      default:              return const Color(0xFF0EA5E9);
    }
  }

  String _timeAgo(DateTime dt, AppLocalizations l) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1)  return l.justNow;
    if (diff.inMinutes < 60) return l.minutesAgo(diff.inMinutes);
    if (diff.inHours < 24)   return l.hoursAgo(diff.inHours);
    if (diff.inDays < 7)     return l.daysAgo(diff.inDays);
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

class _EmptyState extends StatelessWidget {
  final AppLocalizations l;
  const _EmptyState({required this.l});

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.notifications_none_outlined, size: 72, color: Colors.grey.shade300),
        const SizedBox(height: 16),
        Text(l.noNotifications, style: const TextStyle(fontSize: 16, color: Colors.grey)),
        const SizedBox(height: 8),
        Text(l.notifWillAppear, style: const TextStyle(color: Colors.grey, fontSize: 13)),
      ],
    ),
  );
}
