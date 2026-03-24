import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'providers/notifications_provider.dart';
import 'providers/locale_provider.dart';
import 'services/notification_service.dart';
import 'utils/theme.dart';
import 'utils/router.dart';
import 'l10n/app_localizations.dart';

class CebuSafeTourApp extends ConsumerWidget {
  const CebuSafeTourApp({super.key});

  static final _scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final locale = ref.watch(localeProvider);

    // Wire navigator so FCM tap-to-open works from background/terminated state
    NotificationService.setNavigator((route) => router.push(route));

    // Show in-app SnackBar banner for foreground notifications
    ref.listen<NotificationsState>(notificationsProvider, (prev, next) {
      if (prev == null || next.isLoading) return;
      if (next.notifications.length > prev.notifications.length) {
        final notif = next.notifications.first;
        _scaffoldMessengerKey.currentState
          ?..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(notif.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                  Text(notif.body, maxLines: 2, overflow: TextOverflow.ellipsis),
                ],
              ),
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 4),
              action: SnackBarAction(
                label: 'View',
                onPressed: () => router.push('/notifications'),
              ),
            ),
          );
      }
    });

    return MaterialApp.router(
      title: 'CebuSafeTour',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
      scaffoldMessengerKey: _scaffoldMessengerKey,
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
