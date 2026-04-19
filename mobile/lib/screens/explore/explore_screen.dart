import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/attractions_provider.dart';
import '../../providers/meta_provider.dart';
import '../../models/meta.dart';
import '../../widgets/attraction_card.dart';
import '../../widgets/emergency_fab.dart';

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  String _search = '';
  String _debouncedSearch = '';
  String _category = '';
  String _safetyStatus = '';
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _search = value;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted) setState(() => _debouncedSearch = _search);
    });
  }

  String _buildQuery() {
    final parts = <String>['limit=500'];
    if (_debouncedSearch.isNotEmpty) parts.add('search=${Uri.encodeComponent(_debouncedSearch)}');
    if (_category.isNotEmpty) parts.add('category=$_category');
    if (_safetyStatus.isNotEmpty) parts.add('safetyStatus=$_safetyStatus');
    return parts.join('&');
  }

  @override
  Widget build(BuildContext context) {
    final attractions = ref.watch(attractionsProvider(_buildQuery()));
    final l = AppLocalizations.of(context);
    final meta = ref.watch(metaProvider).value ?? AppMeta.defaults;
    final categories    = ['', ...meta.attraction.categories];
    final safetyStatuses = ['', ...meta.attraction.safetyStatuses];

    return Scaffold(
      appBar: AppBar(title: Text(l.exploreCebu)),
      body: Stack(children: [
        Column(children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: l.searchAttractions,
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),

          // Category filter chips
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemCount: categories.length,
              itemBuilder: (ctx, i) {
                final cat = categories[i];
                return FilterChip(
                  label: Text(cat.isEmpty ? l.all : cat[0].toUpperCase() + cat.substring(1)),
                  selected: _category == cat,
                  onSelected: (_) => setState(() => _category = cat),
                  selectedColor: const Color(0xFF0EA5E9),
                  labelStyle: TextStyle(color: _category == cat ? Colors.white : Colors.black87),
                );
              },
            ),
          ),

          // Safety filter
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              children: [
                Center(child: Text('${l.safety}: ', style: const TextStyle(fontWeight: FontWeight.w500))),
                ...safetyStatuses.map((s) {
                  final label = s.isEmpty ? l.all
                      : s == 'safe' ? l.safe
                      : s == 'caution' ? l.caution
                      : l.restricted;
                  return Padding(
                    padding: const EdgeInsets.only(left: 6),
                    child: ChoiceChip(
                      label: Text(label),
                      selected: _safetyStatus == s,
                      onSelected: (_) => setState(() => _safetyStatus = s),
                    ),
                  );
                }),
              ],
            ),
          ),

          // Attractions list
          Expanded(
            child: attractions.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (list) => list.isEmpty
                ? Center(child: Text(l.noAttractionsFound))
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (ctx, i) => InkWell(
                      onTap: () => context.push('/explore/${list[i].id}'),
                      borderRadius: BorderRadius.circular(16),
                      child: AttractionCard(attraction: list[i]),
                    ),
                  ),
            ),
          ),
        ]),
        const Positioned(bottom: 24, right: 24, child: EmergencyFab()),
      ]),
    );
  }
}
