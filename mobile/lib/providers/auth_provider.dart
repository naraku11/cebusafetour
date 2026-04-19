import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';
import '../utils/exceptions.dart';

class AuthState {
  final UserModel? user;
  final String? token;
  final bool isLoading;
  final String? error;
  final bool isSuspended;

  const AuthState({
    this.user,
    this.token,
    this.isLoading = false,
    this.error,
    this.isSuspended = false,
  });

  AuthState copyWith({
    UserModel? user,
    String? token,
    bool? isLoading,
    String? error,
    bool? isSuspended,
  }) =>
      AuthState(
        user: user ?? this.user,
        token: token ?? this.token,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        isSuspended: isSuspended ?? this.isSuspended,
      );
}

class AuthNotifier extends Notifier<AuthState> {
  final AuthService _authService = AuthService();

  @override
  AuthState build() {
    // Run init first; only register the mid-session callback afterwards so
    // that the suspended check inside _init() doesn't fire the callback too.
    _init().then((_) {
      ApiService.onSuspended = _handleSuspended;
    });

    // Clear the callback when the provider is disposed (e.g. during logout)
    // so a stale closure cannot update state after the notifier is gone.
    ref.onDispose(() {
      ApiService.onSuspended = null;
    });

    return const AuthState();
  }

  /// Called by [ApiService] when any authenticated request gets 403
  /// ACCOUNT_SUSPENDED (i.e. the account was suspended mid-session).
  void _handleSuspended() {
    _authService.logout();
    state = const AuthState(
      isSuspended: true,
      error: 'Your account has been suspended or banned. Please contact support.',
    );
  }

  Future<void> _init() async {
    state = state.copyWith(isLoading: true);
    final token = await _authService.getToken();
    if (token != null) {
      try {
        final user = await _authService.getMe();
        if (user != null) {
          // Fresh data — update cache and state.
          await _authService.cacheUser(user);
          state = AuthState(user: user, token: token);
          // Register FCM token for already-logged-in users (fire-and-forget)
          NotificationService.getToken().then((fcmToken) {
            if (fcmToken != null) _authService.updateFcmToken(fcmToken);
          });
        } else {
          // getMe() returned null → network/server error (not a 401).
          // Keep the user logged in using the last cached profile.
          final cachedUser = await _authService.getCachedUser();
          state = AuthState(user: cachedUser, token: token);
        }
      } on TokenExpiredException {
        // 401 — token expired. Restore cached profile so the user still sees
        // their account, but clear the token so protected API calls fail
        // cleanly and the login screen is shown when they try to act.
        final cachedUser = await _authService.getCachedUser();
        await _authService.logout(); // clears token from secure storage
        state = AuthState(
          user: cachedUser,
          token: null,
          error: cachedUser != null ? 'Session expired. Please sign in again.' : null,
        );
      } on AccountSuspendedException catch (e) {
        await _authService.clearUserCache();
        await _authService.logout();
        state = AuthState(isSuspended: true, error: e.message);
      }
    } else {
      state = const AuthState();
    }
  }

  /// Called after OTP verification — saves the token and loads the user into state.
  Future<bool> verifyOtp(String email, String otp) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _authService.verifyOtp(email, otp);
      final token = await _authService.getToken();
      final user  = await _authService.getMe();
      if (user == null || token == null) throw Exception('Could not load account after verification.');
      await _authService.cacheUser(user);
      state = AuthState(user: user, token: token);
      NotificationService.getToken().then((fcmToken) {
        if (fcmToken != null) _authService.updateFcmToken(fcmToken);
      });
      return true;
    } catch (e) {
      final msg = e.toString().replaceFirst('Exception: ', '');
      state = state.copyWith(isLoading: false, error: msg);
      return false;
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null, isSuspended: false);
    try {
      final data = await _authService.login(email, password);
      final user = UserModel.fromJson(data['user']);
      await _authService.cacheUser(user);
      state = AuthState(user: user, token: data['token']);
      // Register FCM token with backend (fire-and-forget)
      NotificationService.getToken().then((token) {
        if (token != null) _authService.updateFcmToken(token);
      });
      return true;
    } on AccountSuspendedException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message, isSuspended: true);
      return false;
    } catch (e) {
      final msg = e.toString().replaceFirst('Exception: ', '');
      state = state.copyWith(isLoading: false, error: msg);
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.clearUserCache();
    await _authService.logout();
    state = const AuthState();
  }

  /// Upload a new profile picture and update the user state.
  /// Returns the updated [UserModel] on success, null on failure.
  Future<UserModel?> updateProfilePicture(File file) async {
    try {
      final updatedUser = await _authService.updateProfilePicture(file);
      state = state.copyWith(user: updatedUser);
      return updatedUser;
    } catch (_) {
      return null;
    }
  }

  /// Update editable profile fields. Returns true on success.
  Future<bool> updateProfile({
    String? name,
    String? nationality,
    String? contactNumber,
    String? language,
    List<Map<String, dynamic>>? emergencyContacts,
  }) async {
    try {
      final updatedUser = await _authService.updateProfile(
        name: name,
        nationality: nationality,
        contactNumber: contactNumber,
        language: language,
        emergencyContacts: emergencyContacts,
      );
      state = state.copyWith(user: updatedUser);
      return true;
    } catch (_) {
      return false;
    }
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
