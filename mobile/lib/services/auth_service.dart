import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path/path.dart' as p;
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import '../models/user.dart';
import '../utils/exceptions.dart';

/// Safely extracts the `error` string from a Dio error response.
/// Works even if the body is HTML (String) instead of JSON (Map).
String _errorMsg(DioException e, String fallback) {
  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return 'Connection timed out. Check your internet and try again.';

    case DioExceptionType.connectionError:
      return 'Cannot reach the server. Check your internet connection.';

    case DioExceptionType.unknown:
      final inner = e.error;
      // SocketException: no route / network unreachable (WiFi with no internet)
      if (inner is SocketException) {
        return 'Cannot reach the server. Check your internet connection.';
      }
      // HandshakeException: SSL/TLS failure — common on WiFi networks that
      // use HTTPS inspection proxies (hotels, offices, captive portals).
      if (inner is HandshakeException) {
        return 'Secure connection failed. Try switching to mobile data or a different network.';
      }
      return 'Connection error. Try switching from WiFi to mobile data.';

    default:
      break;
  }

  final data = e.response?.data;
  if (data is Map) return data['error'] as String? ?? fallback;
  return fallback;
}

class AuthService {
  final _api = ApiService();
  final _storage = const FlutterSecureStorage();

  Future<Map<String, dynamic>> login(
    String email,
    String password, {
    bool rememberMe = true,
  }) async {
    try {
      final res = await _api.post('/auth/login', data: {
        'email': email,
        'password': password,
        'rememberMe': rememberMe,
      });
      // Guard against captive-portal / proxy responses that return HTML instead
      // of JSON — without this the cast throws a TypeError, not a DioException.
      if (res.data is! Map<String, dynamic>) {
        throw Exception(
          'Unexpected response from server. You may be on a restricted WiFi '
          'network (captive portal). Try mobile data instead.',
        );
      }
      final data = res.data as Map<String, dynamic>;
      await _storage.write(key: 'auth_token', value: data['token']);
      return data;
    } on AccountSuspendedException {
      rethrow;
    } on DioException catch (e) {
      throw Exception(_errorMsg(e, 'Login failed. Please try again.'));
    }
  }

  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    String? nationality,
    String? contactNumber,
  }) async {
    try {
      final res = await _api.post('/auth/register', data: {
        'name': name, 'email': email, 'password': password,
        'nationality': nationality, 'contactNumber': contactNumber,
      });
      return res.data as Map<String, dynamic>;
    } on DioException catch (e) {
      final statusCode = e.response?.statusCode;
      final message = e.response?.data is Map
          ? e.response!.data['error'] as String?
          : null;
      if (statusCode == 409) {
        throw Exception(message ?? 'This email is already registered. Please sign in instead.');
      }
      throw Exception(_errorMsg(e, message ?? 'Registration failed. Please try again.'));
    }
  }

  Future<bool> verifyOtp(String email, String otp) async {
    try {
      final res = await _api.post('/auth/verify-otp', data: {'email': email, 'otp': otp});
      final data = res.data as Map<String, dynamic>;
      if (data['token'] != null) {
        await _storage.write(key: 'auth_token', value: data['token']);
      }
      return true;
    } on DioException catch (e) {
      throw Exception(_errorMsg(e, 'Verification failed. Please try again.'));
    }
  }

  Future<UserModel?> getMe() async {
    try {
      final res = await _api.get('/auth/me');
      return UserModel.fromJson((res.data as Map<String, dynamic>)['user']);
    } on AccountSuspendedException {
      rethrow; // Let AuthNotifier handle force-logout
    } on DioException catch (e) {
      // 401 = token explicitly rejected by the server → must re-login.
      // Any other error (timeout, no network, 5xx) → return null so the
      // caller can fall back to cached data without logging the user out.
      if (e.response?.statusCode == 401) throw const TokenExpiredException();
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'auth_token');
  }

  // ── User data cache (SharedPreferences) ───────────────────────────────────
  // Keeps the last known user profile so the app can show it immediately on
  // startup even before (or instead of) a successful /auth/me network call.

  static const _kUserCache = 'cached_user_v1';

  Future<void> cacheUser(UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kUserCache, jsonEncode(user.toJson()));
  }

  Future<UserModel?> getCachedUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kUserCache);
      if (raw == null) return null;
      return UserModel.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> clearUserCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kUserCache);
  }

  Future<String?> getToken() => _storage.read(key: 'auth_token');

  Future<void> updateFcmToken(String token) async {
    await _api.patch('/auth/fcm-token', data: {'fcmToken': token});
  }

  Future<UserModel> updateProfile({
    String? name,
    String? nationality,
    String? contactNumber,
    String? language,
    List<Map<String, dynamic>>? emergencyContacts,
  }) async {
    final res = await _api.patch('/users/me', data: {
      if (name != null) 'name': name,
      if (nationality != null) 'nationality': nationality,
      if (contactNumber != null) 'contactNumber': contactNumber,
      if (language != null) 'language': language,
      if (emergencyContacts != null) 'emergencyContacts': emergencyContacts,
    });
    return UserModel.fromJson((res.data as Map<String, dynamic>)['user']);
  }

  Future<void> resendOtp(String email) async {
    try {
      await _api.post('/auth/resend-otp', data: {'email': email});
    } on DioException catch (e) {
      throw Exception(_errorMsg(e, 'Failed to resend code. Please try again.'));
    }
  }

  /// Returns true if the OTP email was sent, false if delivery failed.
  Future<bool> forgotPassword(String email) async {
    try {
      final res = await _api.post('/auth/forgot-password', data: {'email': email});
      return (res.data as Map?)?['emailSent'] as bool? ?? true;
    } on DioException catch (e) {
      throw Exception(_errorMsg(e, 'Failed to send reset code. Please try again.'));
    }
  }

  Future<void> resetPassword(String email, String otp, String newPassword) async {
    try {
      await _api.post('/auth/reset-password', data: {
        'email': email,
        'otp': otp,
        'newPassword': newPassword,
      });
    } on DioException catch (e) {
      throw Exception(_errorMsg(e, 'Password reset failed. Please try again.'));
    }
  }

  /// Upload a new profile picture. Returns the updated [UserModel].
  Future<UserModel> updateProfilePicture(File file) async {
    final formData = FormData.fromMap({
      'avatar': await MultipartFile.fromFile(
        file.path,
        filename: p.basename(file.path),
      ),
    });
    final res = await _api.postFormData('/users/me/profile-picture', formData: formData);
    return UserModel.fromJson((res.data as Map<String, dynamic>)['user']);
  }
}
