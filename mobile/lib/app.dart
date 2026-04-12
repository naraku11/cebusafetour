import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/notifications_provider.dart';
import 'providers/locale_provider.dart';
import 'providers/advisory_provider.dart';
import 'providers/realtime_provider.dart';
import 'services/notification_service.dart';
import 'services/connectivity_service.dart';
import 'utils/theme.dart';
import 'utils/router.dart' show routerProvider, navigatorKey;
import 'l10n/app_localizations.dart';
import 'widgets/notification_popup.dart';

class CebuSafeTourApp extends ConsumerStatefulWidget {
  const CebuSafeTourApp({super.key});

  @override
  ConsumerState<CebuSafeTourApp> createState() => _CebuSafeTourAppState();
}

class _CebuSafeTourAppState extends ConsumerState<CebuSafeTourApp>
    with WidgetsBindingObserver {

  /// Tracks whether the app was backgrounded so we can detect the
  /// resumed → foreground transition and refresh stale data.
  bool _wasInBackground = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    ConnectivityService.instance.init();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Called by Flutter whenever the app lifecycle state changes.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
      case AppLifecycleState.detached:
        _wasInBackground = true;
        break;

      case AppLifecycleState.resumed:
        if (_wasInBackground) {
          _wasInBackground = false;
          // Refresh time-sensitive data when the user returns to the app.
          // Advisories change when an admin posts a safety alert — stale
          // data here could leave tourists unaware of new hazards.
          ref.invalidate(advisoriesProvider);
          ref.read(notificationsProvider.notifier).refresh();
        }
        break;

      case AppLifecycleState.inactive:
        // Transitional state (e.g. incoming call overlay) — do nothing.
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final locale = ref.watch(localeProvider);
    // Keep the Socket.IO connection alive for the entire authenticated session.
    ref.watch(realtimeProvider);

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
