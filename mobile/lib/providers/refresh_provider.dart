import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Emits an incrementing counter every 3 seconds.
///
/// FutureProviders watch this so they automatically re-fetch on each tick.
/// Because it is a non-autoDispose [StreamProvider] it stays alive for the
/// entire app session — no polling is wasted on cold-start before any screen
/// is ready because [Stream.periodic] does not emit until the first interval
/// has elapsed.
final refreshTickerProvider = StreamProvider<int>((ref) {
  return Stream.periodic(const Duration(seconds: 3), (i) => i + 1);
});
