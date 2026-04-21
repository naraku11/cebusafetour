import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/advisory_provider.dart';
import '../../providers/language_provider.dart';
import '../../providers/notifications_provider.dart';
import '../../utils/constants.dart';
import '../../utils/theme.dart';
import '../../widgets/advisory_card.dart';
import '../../widgets/emergency_fab.dart';
import '../../widgets/language_picker_sheet.dart';

class HomeDashboard extends ConsumerStatefulWidget {
  const HomeDashboard({super.key});

  @override
  ConsumerState<HomeDashboard> createState() => _HomeDashboardState();
}

class _HomeDashboardState extends ConsumerState<HomeDashboard> {
  Future<void> _pickLanguage() async {
    final l = AppLocalizations.of(context);
    final current = ref.read(languageProvider);
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => LanguagePickerSheet(
        title: l.selectLanguage,
        searchHint: l.searchLanguage,
        currentCode: current,
      ),
    );
    if (picked != null) {
      await ref.read(languageProvider.notifier).setLanguage(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Use selectors to only rebuild when the specific fields change
    final userName = ref.watch(authProvider.select((s) => s.user?.name));
    final userPicture = ref.watch(authProvider.select((s) => s.user?.profilePicture));
    final advisories = ref.watch(advisoriesProvider);
    final unread = ref.watch(notificationsProvider.select((s) => s.unreadCount));
    final notificationsLoading = ref.watch(
      notificationsProvider.select((s) => s.isLoading),
    );
    final l = AppLocalizations.of(context);

    final quickActions = [
      {'icon': Icons.explore_outlined, 'label': l.explore, 'route': '/explore', 'color': const Color(0xFF0EA5E9)},
      {'icon': Icons.warning_amber_outlined, 'label': l.advisories, 'route': '/advisories', 'color': const Color(0xFFF59E0B)},
      {'icon': Icons.map_outlined, 'label': l.tripPlanner, 'route': '/trip-planner', 'color': const Color(0xFF14B8A6)},
      {'icon': Icons.local_hospital_outlined, 'label': l.emergency, 'route': '/emergency', 'color': const Color(0xFFEF4444)},
      {'icon': Icons.help_outline, 'label': l.helpAndFaq, 'route': '/help', 'color': const Color(0xFF8B5CF6)},
    ];

    return PopScope<Object?>(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final shouldExit = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(l.exitApp),
            content: Text(l.exitConfirm),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: Text(l.cancel),
              ),
              TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: Text(l.exit, style: const TextStyle(color: Colors.red)),
              ),
            ],
          ),
        );
        if (shouldExit == true) SystemNavigator.pop();
      },
      child: Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            CustomScrollView(
              slivers: [
                // Header
                SliverToBoxAdapter(
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF0C4A6E), AppTheme.primaryColor],
                        begin: Alignment.topLeft, end: Alignment.bottomRight,
                      ),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(
                            l.greeting((userName ?? 'Traveler').split(' ').first),
                            style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(l.exploreSafely, style: const TextStyle(color: Colors.white70)),
                        ])),
                        IconButton(
                          icon: Text(
                            languageFlag(ref.watch(languageProvider)),
                            style: const TextStyle(fontSize: 20),
                          ),
                          tooltip: l.selectLanguage,
                          onPressed: _pickLanguage,
                        ),
                        Stack(children: [
                          IconButton(
                            icon: const Icon(Icons.notifications_outlined, color: Colors.white),
                            onPressed: () => context.push('/notifications'),
                          ),
                          if (notificationsLoading)
                            Positioned(
                              right: 8,
                              top: 8,
                              child: Container(
                                width: 16,
                                height: 16,
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.95),
                                  shape: BoxShape.circle,
                                ),
                                padding: const EdgeInsets.all(3),
                                child: const CircularProgressIndicator(
                                  strokeWidth: 1.8,
                                  valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                                ),
                              ),
                            )
                          else if (unread > 0)
                            Positioned(
                              right: 8, top: 8,
                              child: Container(
                                padding: const EdgeInsets.all(3),
                                decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                                constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                                child: Text(
                                  unread > 99 ? '99+' : '$unread',
                                  style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ),
                        ]),
                        const SizedBox(width: 4),
                        GestureDetector(
                          onTap: () => context.push('/profile'),
                          child: _buildHeaderAvatar(userPicture, userName),
                        ),
                      ]),
                    ]),
                  ),
                ),

                // Quick Actions
                SliverPadding(
                  padding: const EdgeInsets.all(20),
                  sliver: SliverToBoxAdapter(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(l.quickActions, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      Row(
                        children: quickActions.map((action) {
                          return Expanded(
                            child: GestureDetector(
                              onTap: () => context.push(action['route'] as String),
                              child: Column(mainAxisSize: MainAxisSize.min, children: [
                                Container(
                                  width: 56, height: 56,
                                  decoration: BoxDecoration(
                                    color: (action['color'] as Color).withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  alignment: Alignment.center,
                                  child: Icon(action['icon'] as IconData, color: action['color'] as Color, size: 28),
                                ),
                                const SizedBox(height: 7),
                                Text(
                                  action['label'] as String,
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
                                  textAlign: TextAlign.center,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ]),
                            ),
                          );
                        }).toList(),
                      ),
                    ]),
                  ),
                ),

                // Active Advisories
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverToBoxAdapter(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                        Text(l.activeAdvisories, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        TextButton(onPressed: () => context.push('/advisories'), child: Text(l.viewAll)),
                      ]),
                      advisories.when(
                        loading: () => const Center(child: CircularProgressIndicator()),
                        error: (e, _) => Text(l.failedToLoad),
                        data: (list) => list.isEmpty
                          ? Padding(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              child: Text(l.noActiveAdvisories, style: const TextStyle(color: Colors.grey)),
                            )
                          : Column(children: list.take(3).map((a) => AdvisoryCard(advisory: a)).toList()),
                      ),
                      const SizedBox(height: 80),
                    ]),
                  ),
                ),
              ],
            ),

            // Emergency FAB (always on top)
            const Positioned(bottom: 24, right: 24, child: EmergencyFab()),
          ],
        ),
      ),
    ),  // closes Scaffold
  );  // closes PopScope
  }
}

String _resolveUrl(String url) =>
    url.startsWith('/') ? '${AppConstants.serverUrl}$url' : url;

Widget _buildHeaderAvatar(String? url, String? name) {
  final initials = (name?.trim().isNotEmpty == true)
      ? name!.trim().split(' ').map((w) => w[0].toUpperCase()).take(2).join()
      : 'G';

  if (url != null && url.isNotEmpty) {
    return CircleAvatar(
      radius: 20,
      backgroundColor: Colors.white24,
      child: ClipOval(
        child: CachedNetworkImage(
          imageUrl: _resolveUrl(url),
          width: 40,
          height: 40,
          fit: BoxFit.cover,
          placeholder: (_, __) => Text(initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          errorWidget: (_, __, ___) => Text(initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
      ),
    );
  }

  return CircleAvatar(
    radius: 20,
    backgroundColor: Colors.white24,
    child: Text(initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
  );
}
