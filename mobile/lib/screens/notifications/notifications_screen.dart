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
  final _scrollController = ScrollController();
  Future<void> _confirmClearAll() async {
    final notifier = ref.read(notificationsProvider.notifier);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear notifications?'),
        content: const Text('This will clear all notifications from this screen.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
    if (ok == true && mounted) {
      await notifier.clearAll();
    }
  }

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(notificationsProvider.notifier).markAllRead();
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    final pos = _scrollController.position;
    if (pos.pixels >= pos.maxScrollExtent - 200) {
      final notifier = ref.read(notificationsProvider.notifier);
      final state    = ref.read(notificationsProvider);
      if (!state.isLoading && state.hasMore) notifier.loadMore();
    }
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
              icon: const Icon(Icons.clear_all_outlined),
              onPressed: _confirmClearAll,
              tooltip: 'Clear all',
            ),
          if (state.notifications.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.refresh_outlined),
              onPressed: () => ref.read(notificationsProvider.notifier).refresh(),
              tooltip: l.refresh,
            ),
        ],
      ),
      body: state.isLoading && state.notifications.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : state.notifications.isEmpty
              ? _EmptyState(l: l)
              : RefreshIndicator(
                  onRefresh: () => ref.read(notificationsProvider.notifier).refresh(),
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                    // +1 slot for the bottom loader when more pages remain
                    itemCount: state.notifications.length + (state.hasMore ? 1 : 0),
                    itemBuilder: (ctx, i) {
                      if (i == state.notifications.length) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                        );
                      }
                      return _NotificationCard(
                        n: state.notifications[i],
                        l: l,
                        onTap: () => ref.read(notificationsProvider.notifier)
                            .markOneRead(state.notifications[i].id),
                      );
                    },
                  ),
                ),
    );
  }
}

// ── Notification Card ───────────────────────────────────────────────────────

class _NotificationCard extends StatelessWidget {
  final AppNotification n;
  final AppLocalizations l;
  final VoidCallback? onTap;
  const _NotificationCard({required this.n, required this.l, this.onTap});

  @override
  Widget build(BuildContext context) {
    final color = _typeColor(n.type);
    final isHighPriority = n.priority == 'high';

    return GestureDetector(
      onTap: onTap,
      child: Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: n.isRead ? Colors.white : const Color(0xFFF0F7FF),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: n.isEmergency
              ? Colors.red.withValues(alpha: 0.4)
              : isHighPriority
                  ? color.withValues(alpha: 0.3)
                  : Colors.grey.shade100,
          width: n.isEmergency || isHighPriority ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: n.isEmergency
                ? Colors.red.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icon
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(_typeIcon(n.type), color: color, size: 22),
            ),
            const SizedBox(width: 12),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type label + priority badge row
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          _typeLabel(n.type),
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: color,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      if (isHighPriority) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.red.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.priority_high, size: 10, color: Colors.red),
                              SizedBox(width: 2),
                              Text(
                                'HIGH',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.red,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const Spacer(),
                      Text(
                        _timeAgo(n.receivedAt, l),
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  // Title
                  Text(
                    n.title,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 3),
                  // Body
                  Text(
                    n.body,
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.4),
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),  // Container (child of GestureDetector)
    );  // GestureDetector
  }

  String _typeLabel(String type) {
    switch (type) {
      case 'emergency':     return 'EMERGENCY';
      case 'safety_alert':  return 'SAFETY ALERT';
      case 'advisory':      return 'ADVISORY';
      case 'trip_reminder': return 'TRIP REMINDER';
      default:              return 'ANNOUNCEMENT';
    }
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
      case 'emergency':     return const Color(0xFFDC2626);
      case 'safety_alert':  return const Color(0xFFEA580C);
      case 'advisory':      return const Color(0xFFD97706);
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

// ── Empty State ─────────────────────────────────────────────────────────────

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
