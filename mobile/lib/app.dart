import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/notifications_provider.dart';
import 'providers/locale_provider.dart';
import 'services/notification_service.dart';
import 'utils/theme.dart';
import 'utils/router.dart' show routerProvider, navigatorKey;
import 'l10n/app_localizations.dart';
import 'widgets/notification_popup.dart';

class CebuSafeTourApp extends ConsumerStatefulWidget {
  const CebuSafeTourApp({super.key});

  @override
  ConsumerState<CebuSafeTourApp> createState() => _CebuSafeTourAppState();
}

class _CebuSafeTourAppState extends ConsumerState<CebuSafeTourApp> {
  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final locale = ref.watch(localeProvider);

    // Wire navigator so FCM tap-to-open works from background/terminated state
    NotificationService.setNavigator((route) => router.push(route));

    // Show rich popup overlay for foreground notifications
    ref.listen<NotificationsState>(notificationsProvider, (prev, next) {
      if (prev == null || next.isLoading) return;
      if (next.notifications.length > prev.notifications.length) {
        final notif = next.notifications.first;
        // Use addPostFrameCallback to ensure overlay context is available
        WidgetsBinding.instance.addPostFrameCallback((_) {
          final ctx = navigatorKey.currentContext;
          if (ctx != null) {
            NotificationPopupManager.show(
              ctx,
              notif,
              navigator: (route) => router.push(route),
            );
          }
        });
      }
    });

    return MaterialApp.router(
      title: 'CebuSafeTour',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
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
