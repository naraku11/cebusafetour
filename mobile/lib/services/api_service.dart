import 'package:dio/dio.dart';
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

  final _storage = const FlutterSecureStorage();

  late final Dio _dio = Dio(BaseOptions(
    baseUrl: AppConstants.baseUrl,
    connectTimeout: const Duration(seconds: 20),
    sendTimeout:    const Duration(seconds: 20),
    receiveTimeout: const Duration(seconds: 20),
  ))
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
