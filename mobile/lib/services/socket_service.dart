import 'package:socket_io_client/socket_io_client.dart' as io;
import '../utils/constants.dart';

/// Singleton Socket.IO client for the mobile app.
///
/// The socket connects with the user's JWT token so the server can join it
/// to the correct rooms (`tourists` room for broadcast events).
///
/// Usage
/// ─────
///   // Connect after login:
///   SocketService.instance.connect(token);
///
///   // Listen to events:
///   SocketService.instance.on('advisory:new', (_) { ... });
///
///   // Disconnect on logout:
///   SocketService.instance.disconnect();
class SocketService {
  SocketService._();
  static final SocketService instance = SocketService._();

  io.Socket? _socket;

  bool get isConnected => _socket?.connected ?? false;

  /// Connects to the backend Socket.IO server.
  /// Safe to call multiple times — reconnects only when not already connected.
  void connect(String token) {
    if (_socket?.connected == true) return;

    _socket?.dispose(); // clean up any stale socket

    _socket = io.io(
      AppConstants.serverUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])        // skip HTTP long-poll
          .setAuth({'token': token})
          .enableReconnection()
          .setReconnectionDelay(2000)          // ms before first retry
          .setReconnectionDelayMax(30000)      // cap backoff at 30 s
          .setReconnectionAttempts(15)
          .disableAutoConnect()                // we call connect() manually
          .build(),
    );

    _socket!.connect();
  }

  /// Register a listener for a named event.
  /// Calling [on] before [connect] is safe — handlers survive reconnections.
  void on(String event, void Function(dynamic) handler) {
    _socket?.on(event, handler);
  }

  /// Remove a specific listener registered with [on].
  void off(String event, void Function(dynamic) handler) {
    _socket?.off(event, handler);
  }

  /// Disconnect and release all resources.
  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }
}
