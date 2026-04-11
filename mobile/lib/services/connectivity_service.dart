import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Singleton that monitors network connectivity and broadcasts a signal
/// every time the device goes from offline → online.
///
/// Screens and providers subscribe via [onReconnected] so they can refresh
/// stale data without polling constantly while online.
///
/// Lifecycle
/// ─────────
/// Call [ConnectivityService.instance.init()] once in [main()] before
/// [runApp()].  Call [dispose()] only if you ever tear down the entire app
/// (not typically needed in Flutter).
class ConnectivityService {
  ConnectivityService._();
  static final ConnectivityService instance = ConnectivityService._();

  // Broadcast stream — multiple listeners allowed (providers + screens)
  final _reconnectedController = StreamController<void>.broadcast();

  /// Emits one event every time connectivity is restored after a gap.
  Stream<void> get onReconnected => _reconnectedController.stream;

  StreamSubscription<List<ConnectivityResult>>? _sub;
  bool _wasOffline = false;

  /// Start listening.  Safe to call multiple times — subsequent calls are no-ops.
  void init() {
    if (_sub != null) return;
    _sub = Connectivity().onConnectivityChanged.listen((results) {
      final online = results.any((r) => r != ConnectivityResult.none);
      if (_wasOffline && online) {
        _reconnectedController.add(null); // signal: back online
      }
      _wasOffline = !online;
    });
  }

  void dispose() {
    _sub?.cancel();
    _sub = null;
    _reconnectedController.close();
  }
}
