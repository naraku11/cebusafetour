import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/advisory.dart';
import '../services/api_service.dart';
final _api = ApiService();

final advisoriesProvider = FutureProvider<List<Advisory>>((ref) async {
  final res = await _api.get('/advisories', params: {'status': 'active', 'limit': '50'});
  final list = (res.data['advisories'] as List);
  return list.map((e) => Advisory.fromJson(e as Map<String, dynamic>)).toList();
});
