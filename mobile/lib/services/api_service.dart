import 'package:dio/dio.dart';
import 'package:dio_cache_interceptor/dio_cache_interceptor.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../utils/constants.dart';
import '../utils/exceptions.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  /// Called when the server tells us the current user is suspended/banned
  /// mid-session (i.e. while already authenticated). Set by [AuthNotifier].
  static void Function()? onSuspended;

  /// In-memory HTTP response cache shared across the app session.
  ///
  /// Policy: `request` — honours the server's Cache-Control header, so each
  /// endpoint controls its own TTL (attractions: 300 s, advisories: 120 s).
  /// On network error, falls back to a stale cached copy (except on 401/403).
  static final _cacheOptions = CacheOptions(
    store: MemCacheStore(),
    policy: CachePolicy.request,
    maxStale: const Duration(minutes: 30),
    priority: CachePriority.normal,
  );

  final _storage = const FlutterSecureStorage();

  late final Dio _dio = Dio(BaseOptions(
    baseUrl: AppConstants.baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
  ))
    // Cache interceptor runs first so hits short-circuit before auth logic.
    ..interceptors.add(DioCacheInterceptor(options: _cacheOptions))
    ..interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'auth_token');
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (err, handler) {
        final data = err.response?.data;
        if (err.response?.statusCode == 403 &&
            data is Map &&
            data['code'] == 'ACCOUNT_SUSPENDED') {
          // Notify AuthNotifier so it can force-logout mid-session.
          onSuspended?.call();
          handler.reject(DioException(
            requestOptions: err.requestOptions,
            error: AccountSuspendedException(
              (data['error'] as String?) ??
                  'Your account has been suspended or banned.',
            ),
            type: DioExceptionType.badResponse,
            response: err.response,
          ));
          return;
        }
        handler.next(err);
      },
    ));

  Future<Response> get(String path, {Map<String, dynamic>? params}) =>
      _dio.get(path, queryParameters: params);

  Future<Response> post(String path, {dynamic data}) =>
      _dio.post(path, data: data);

  Future<Response> postFormData(String path, {required FormData formData}) =>
      _dio.post(path, data: formData);

  Future<Response> put(String path, {dynamic data}) =>
      _dio.put(path, data: data);

  Future<Response> patch(String path, {dynamic data}) =>
      _dio.patch(path, data: data);

  Future<Response> delete(String path) => _dio.delete(path);
}
