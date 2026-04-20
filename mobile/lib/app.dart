import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'models/app_notification.dart';
import 'providers/notifications_provider.dart';
import 'providers/locale_provider.dart';
import 'providers/advisory_provider.dart';
import 'providers/meta_provider.dart';
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

  bool _wasInBackground = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    ConnectivityService.instance.init();
    ref.read(metaProvider);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

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
          ref.invalidate(advisoriesProvider);
          ref.read(notificationsProvider.notifier).refresh();
        }
        break;

      case AppLifecycleState.inactive:
        break;
    }
  }

  void _showPopup(AppNotification notif) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = navigatorKey.currentContext;
      if (ctx == null) return;
      NotificationPopupManager.show(
        ctx,
        notif,
        navigator: (route) => ref.read(routerProvider).push(route),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final locale = ref.watch(localeProvider);
    ref.watch(realtimeProvider);

    // Show in-app popup whenever realtimeProvider delivers a notification
    ref.listen<AppNotification?>(notificationToastProvider, (_, next) {
      if (next == null) return;
      _showPopup(next);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(notificationToastProvider.notifier).clear();
      });
    });

    NotificationService.setNavigator((route) => router.push(route));

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
