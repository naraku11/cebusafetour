import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';
import '../../l10n/app_localizations.dart';
import '../../models/attraction.dart';
import '../../models/trip_plan.dart';
import '../../providers/attractions_provider.dart';
import '../../providers/trip_provider.dart';
import '../../utils/theme.dart';
import '../../widgets/safety_badge.dart';
import '../../widgets/emergency_fab.dart';

// ─── Category metadata ────────────────────────────────────────────────────────

const _categories = [
  ('all', 'All', '🗺️'),
  ('beach', 'Beach', '🏖️'),
  ('mountain', 'Mountain', '⛰️'),
  ('heritage', 'Heritage', '🏛️'),
  ('museum', 'Museum', '🏺'),
  ('park', 'Park', '🌿'),
  ('waterfall', 'Waterfall', '💧'),
  ('market', 'Market', '🛒'),
  ('church', 'Church', '⛪'),
  ('resort', 'Resort', '🏨'),
  ('other', 'Other', '📍'),
];

// ─── Main screen ──────────────────────────────────────────────────────────────

class TripPlannerScreen extends ConsumerStatefulWidget {
  const TripPlannerScreen({super.key});

  @override
  ConsumerState<TripPlannerScreen> createState() => _TripPlannerScreenState();
}

class _TripPlannerScreenState extends ConsumerState<TripPlannerScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final trip = ref.watch(tripProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.tripPlanner),
        actions: [
          IconButton(
            icon: const Icon(Icons.folder_open_outlined),
            tooltip: 'My Trips',
            onPressed: () => _showMyTrips(context),
          ),
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            tooltip: 'New Trip',
            onPressed: () => _confirmNewTrip(context),
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppTheme.primaryColor,
          unselectedLabelColor: Colors.grey,
          indicatorColor: AppTheme.primaryColor,
          tabs: const [
            Tab(icon: Icon(Icons.edit_note_outlined), text: 'Plan'),
            Tab(icon: Icon(Icons.explore_outlined), text: 'Explore'),
            Tab(icon: Icon(Icons.format_list_numbered_outlined), text: 'Itinerary'),
          ],
        ),
      ),
      body: Stack(children: [
        TabBarView(
          controller: _tabs,
          children: [
            _PlanTab(trip: trip),
            _ExploreTab(trip: trip),
            _ItineraryTab(trip: trip),
          ],
        ),
        const Positioned(bottom: 24, right: 24, child: EmergencyFab()),
      ]),
    );
  }

  Future<void> _confirmNewTrip(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New Trip'),
        content: const Text('Start a new trip? Your current trip is already saved.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('New Trip')),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await ref.read(tripProvider.notifier).newTrip();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('New trip started!')));
    }
  }

  Future<void> _showMyTrips(BuildContext context) async {
    final notifier = ref.read(tripProvider.notifier);
    final trips = await notifier.loadAllTrips();
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _MyTripsSheet(trips: trips, notifier: notifier),
    );
  }
}

// ─── My Trips Sheet ───────────────────────────────────────────────────────────

class _MyTripsSheet extends ConsumerStatefulWidget {
  final List<TripPlan> trips;
  final TripPlannerNotifier notifier;
  const _MyTripsSheet({required this.trips, required this.notifier});

  @override
  ConsumerState<_MyTripsSheet> createState() => _MyTripsSheetState();
}

class _MyTripsSheetState extends ConsumerState<_MyTripsSheet> {
  late List<TripPlan> _trips;

  @override
  void initState() {
    super.initState();
    _trips = widget.trips;
  }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('MMM d, yyyy');
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      builder: (_, ctrl) => Column(children: [
        Container(
          margin: const EdgeInsets.only(top: 12, bottom: 4),
          width: 40, height: 4,
          decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(children: [
            const Text('My Trips', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const Spacer(),
            Text('${_trips.length} trips', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          ]),
        ),
        const Divider(height: 1),
        if (_trips.isEmpty)
          Expanded(
            child: Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.luggage_outlined, size: 56, color: Colors.grey[300]),
                const SizedBox(height: 12),
                Text('No saved trips yet', style: TextStyle(color: Colors.grey[500])),
              ]),
            ),
          )
        else
          Expanded(
            child: ListView.separated(
              controller: ctrl,
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: _trips.length,
              separatorBuilder: (_, __) => const Divider(height: 1, indent: 20),
              itemBuilder: (ctx, i) {
                final t = _trips[i];
                final isActive = ref.watch(tripProvider).id == t.id;
                return ListTile(
                  leading: Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      color: isActive
                          ? AppTheme.primaryColor.withValues(alpha: 0.12)
                          : Colors.grey[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.luggage_outlined,
                      color: isActive ? AppTheme.primaryColor : Colors.grey,
                    ),
                  ),
                  title: Text(t.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    if (t.startDate != null)
                      Text('${fmt.format(t.startDate!)}${t.endDate != null ? ' → ${fmt.format(t.endDate!)}' : ''}',
                          style: const TextStyle(fontSize: 12)),
                    Text('${t.attractions.length} places · ${t.travelers} traveler(s)',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                  ]),
                  trailing: isActive
                      ? const Chip(
                          label: Text('Active', style: TextStyle(fontSize: 11)),
                          backgroundColor: Color(0xFFD1FAE5),
                          padding: EdgeInsets.zero,
                          side: BorderSide.none,
                        )
                      : Row(mainAxisSize: MainAxisSize.min, children: [
                          IconButton(
                            icon: const Icon(Icons.open_in_new_outlined, size: 20),
                            tooltip: 'Load',
                            onPressed: () async {
                              await widget.notifier.loadTrip(t);
                              if (context.mounted) Navigator.pop(context);
                            },
                          ),
                          IconButton(
                            icon: Icon(Icons.delete_outline, size: 20, color: Colors.red[400]),
                            tooltip: 'Delete',
                            onPressed: () async {
                              final ok = await showDialog<bool>(
                                context: ctx,
                                builder: (d) => AlertDialog(
                                  title: const Text('Delete Trip?'),
                                  content: Text('Delete "${t.name}"?'),
                                  actions: [
                                    TextButton(onPressed: () => Navigator.pop(d, false), child: const Text('Cancel')),
                                    TextButton(onPressed: () => Navigator.pop(d, true),
                                        child: const Text('Delete', style: TextStyle(color: Colors.red))),
                                  ],
                                ),
                              );
                              if (ok == true) {
                                await widget.notifier.deleteTrip(t.id);
                                setState(() => _trips.removeWhere((x) => x.id == t.id));
                              }
                            },
                          ),
                        ]),
                );
              },
            ),
          ),
      ]),
    );
  }
}

// ─── Tab 1: Plan ──────────────────────────────────────────────────────────────

class _PlanTab extends ConsumerStatefulWidget {
  final TripPlan trip;
  const _PlanTab({required this.trip});

  @override
  ConsumerState<_PlanTab> createState() => _PlanTabState();
}

class _PlanTabState extends ConsumerState<_PlanTab> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _notesCtrl;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.trip.name);
    _notesCtrl = TextEditingController(text: widget.trip.notes);
  }

  @override
  void didUpdateWidget(_PlanTab old) {
    super.didUpdateWidget(old);
    if (old.trip.id != widget.trip.id) {
      _nameCtrl.text = widget.trip.name;
      _notesCtrl.text = widget.trip.notes;
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool isStart) async {
    final now = DateTime.now();
    final initial = isStart
        ? (widget.trip.startDate ?? now)
        : (widget.trip.endDate ?? (widget.trip.startDate ?? now));
    final first = isStart ? now : (widget.trip.startDate ?? now);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(first) ? first : initial,
      firstDate: first,
      lastDate: now.add(const Duration(days: 730)),
    );
    if (picked == null || !mounted) return;
    final notifier = ref.read(tripProvider.notifier);
    if (isStart) {
      final end = widget.trip.endDate;
      await notifier.setDates(picked, end != null && end.isBefore(picked) ? picked : end);
    } else {
      await notifier.setDates(widget.trip.startDate, picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip = ref.watch(tripProvider);
    final notifier = ref.read(tripProvider.notifier);
    final fmt = DateFormat('MMM d, yyyy');

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [

        // ── Trip Name ──
        _SectionLabel(icon: Icons.edit_outlined, label: 'Trip Name'),
        const SizedBox(height: 8),
        TextField(
          controller: _nameCtrl,
          decoration: const InputDecoration(hintText: 'e.g. Summer Cebu Adventure'),
          onSubmitted: (v) => notifier.setName(v),
          onTapOutside: (_) => notifier.setName(_nameCtrl.text),
          textInputAction: TextInputAction.done,
        ),
        const SizedBox(height: 20),

        // ── Travel Dates ──
        _SectionLabel(icon: Icons.calendar_today_outlined, label: 'Travel Dates'),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: _DateButton(
            label: trip.startDate != null ? fmt.format(trip.startDate!) : 'Start Date',
            icon: Icons.flight_takeoff_outlined,
            hasValue: trip.startDate != null,
            onTap: () => _pickDate(true),
          )),
          const SizedBox(width: 10),
          Expanded(child: _DateButton(
            label: trip.endDate != null ? fmt.format(trip.endDate!) : 'End Date',
            icon: Icons.flight_land_outlined,
            hasValue: trip.endDate != null,
            onTap: () => _pickDate(false),
          )),
        ]),
        if (trip.numDays > 0) ...[
          const SizedBox(height: 8),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.info_outline, size: 14, color: Colors.grey[500]),
            const SizedBox(width: 4),
            Text('${trip.numDays} day${trip.numDays == 1 ? '' : 's'} trip',
                style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          ]),
        ],
        const SizedBox(height: 20),

        // ── Travelers ──
        _SectionLabel(icon: Icons.group_outlined, label: 'Travelers'),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFD1D5DB)),
          ),
          child: Row(children: [
            Icon(Icons.person_outlined, color: Colors.grey[600]),
            const SizedBox(width: 8),
            Text('${trip.travelers} traveler${trip.travelers == 1 ? '' : 's'}',
                style: const TextStyle(fontSize: 15)),
            const Spacer(),
            IconButton(
              icon: const Icon(Icons.remove_circle_outline),
              onPressed: trip.travelers > 1 ? () => notifier.setTravelers(trip.travelers - 1) : null,
            ),
            Text('${trip.travelers}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              onPressed: () => notifier.setTravelers(trip.travelers + 1),
            ),
          ]),
        ),
        const SizedBox(height: 20),

        // ── Budget Estimate ──
        if (trip.attractions.isNotEmpty) ...[
          _SectionLabel(icon: Icons.attach_money_outlined, label: 'Budget Estimate'),
          const SizedBox(height: 8),
          _BudgetCard(trip: trip),
          const SizedBox(height: 20),
        ],

        // ── Notes ──
        _SectionLabel(icon: Icons.notes_outlined, label: 'Trip Notes'),
        const SizedBox(height: 8),
        TextField(
          controller: _notesCtrl,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: 'Reminders, tips, packing list...',
            alignLabelWithHint: true,
          ),
          onChanged: (v) => notifier.setNotes(v),
        ),
        const SizedBox(height: 20),

        // ── Save confirmation ──
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBBF7D0)),
          ),
          child: Row(children: [
            const Icon(Icons.cloud_done_outlined, color: Color(0xFF10B981), size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Trip auto-saves as you edit.',
                style: TextStyle(color: const Color(0xFF065F46), fontSize: 13),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}

// ─── Tab 2: Explore ───────────────────────────────────────────────────────────

class _ExploreTab extends ConsumerStatefulWidget {
  final TripPlan trip;
  const _ExploreTab({required this.trip});

  @override
  ConsumerState<_ExploreTab> createState() => _ExploreTabState();
}

class _ExploreTabState extends ConsumerState<_ExploreTab> {
  String _search = '';
  String _category = 'all';
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final trip = ref.watch(tripProvider);
    final notifier = ref.read(tripProvider.notifier);
    final allAsync = ref.watch(attractionsProvider('status=published&limit=200'));

    return Column(children: [
      // Search bar
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
        child: TextField(
          controller: _searchCtrl,
          decoration: InputDecoration(
            hintText: 'Search attractions...',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: _search.isNotEmpty
                ? IconButton(icon: const Icon(Icons.clear), onPressed: () {
                    _searchCtrl.clear();
                    setState(() => _search = '');
                  })
                : null,
            contentPadding: const EdgeInsets.symmetric(vertical: 10),
          ),
          onChanged: (v) => setState(() => _search = v),
        ),
      ),
      // Category chips
      SizedBox(
        height: 48,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          itemCount: _categories.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, i) {
            final (code, label, emoji) = _categories[i];
            final selected = _category == code;
            return FilterChip(
              label: Text('$emoji $label', style: TextStyle(fontSize: 12)),
              selected: selected,
              onSelected: (_) => setState(() => _category = code),
              backgroundColor: Colors.white,
              selectedColor: AppTheme.primaryColor.withValues(alpha: 0.15),
              checkmarkColor: AppTheme.primaryColor,
              side: BorderSide(
                color: selected ? AppTheme.primaryColor : const Color(0xFFE5E7EB),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 4),
            );
          },
        ),
      ),
      // Count badge
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Row(children: [
          Text(
            '${trip.attractions.length} selected',
            style: TextStyle(
              color: trip.attractions.isEmpty ? Colors.grey[500] : AppTheme.primaryColor,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ]),
      ),
      // Attraction list
      Expanded(
        child: allAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Failed to load: $e')),
          data: (all) {
            final filtered = all.where((a) {
              final matchSearch = _search.isEmpty ||
                  a.name.toLowerCase().contains(_search.toLowerCase()) ||
                  (a.district?.toLowerCase().contains(_search.toLowerCase()) ?? false);
              final matchCat = _category == 'all' || a.category == _category;
              return matchSearch && matchCat;
            }).toList();

            if (filtered.isEmpty) {
              return Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.search_off, size: 48, color: Colors.grey[300]),
                  const SizedBox(height: 8),
                  Text('No attractions found', style: TextStyle(color: Colors.grey[500])),
                ]),
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
              itemCount: filtered.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (ctx, i) {
                final a = filtered[i];
                final inTrip = trip.attractions.any((t) => t.id == a.id);
                return _AttractionCard(
                  attraction: a,
                  inTrip: inTrip,
                  onToggle: () => notifier.toggleAttraction(a),
                );
              },
            );
          },
        ),
      ),
    ]);
  }
}

class _AttractionCard extends StatelessWidget {
  final Attraction attraction;
  final bool inTrip;
  final VoidCallback onToggle;

  const _AttractionCard({
    required this.attraction,
    required this.inTrip,
    required this.onToggle,
  });

  String get _categoryEmoji {
    return switch (attraction.category) {
      'beach' => '🏖️',
      'mountain' => '⛰️',
      'heritage' => '🏛️',
      'museum' => '🏺',
      'park' => '🌿',
      'waterfall' => '💧',
      'market' => '🛒',
      'church' => '⛪',
      'resort' => '🏨',
      _ => '📍',
    };
  }

  @override
  Widget build(BuildContext context) {
    final fee = attraction.entranceFee > 0
        ? '₱${attraction.entranceFee.toStringAsFixed(0)}'
        : 'Free';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: inTrip ? AppTheme.primaryColor : const Color(0xFFE5E7EB),
          width: inTrip ? 1.5 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(children: [
          // Category emoji circle
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(child: Text(_categoryEmoji, style: const TextStyle(fontSize: 18))),
          ),
          const SizedBox(width: 12),
          // Info
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(attraction.name,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 3),
            Row(children: [
              SafetyBadge(status: attraction.safetyStatus, small: true),
              const SizedBox(width: 6),
              Text(fee,
                  style: TextStyle(
                    color: attraction.entranceFee > 0 ? Colors.orange[700] : Colors.green[700],
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  )),
              if (attraction.district != null) ...[
                const SizedBox(width: 6),
                Flexible(
                  child: Text('· ${attraction.district}',
                      style: const TextStyle(color: Colors.grey, fontSize: 11),
                      overflow: TextOverflow.ellipsis),
                ),
              ],
            ]),
            if (attraction.averageRating > 0) ...[
              const SizedBox(height: 2),
              Row(children: [
                Icon(Icons.star_rounded, size: 12, color: Colors.amber[600]),
                const SizedBox(width: 2),
                Text(attraction.averageRating.toStringAsFixed(1),
                    style: const TextStyle(fontSize: 11, color: Colors.grey)),
                Text(' (${attraction.totalReviews})',
                    style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ]),
            ],
          ])),
          const SizedBox(width: 8),
          // Toggle button
          GestureDetector(
            onTap: onToggle,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: inTrip ? AppTheme.primaryColor : Colors.grey[100],
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                inTrip ? Icons.check : Icons.add,
                color: inTrip ? Colors.white : Colors.grey[600],
                size: 20,
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

// ─── Tab 3: Itinerary ─────────────────────────────────────────────────────────

class _ItineraryTab extends ConsumerWidget {
  final TripPlan trip;
  const _ItineraryTab({required this.trip});

  String _buildShareText(TripPlan trip) {
    final fmt = DateFormat('MMM d, yyyy');
    final buf = StringBuffer();
    buf.writeln('🌺 ${trip.name}');
    if (trip.startDate != null) {
      buf.write('📅 ${fmt.format(trip.startDate!)}');
      if (trip.endDate != null) buf.write(' → ${fmt.format(trip.endDate!)}');
      if (trip.numDays > 0) buf.write(' (${trip.numDays} days)');
      buf.writeln();
    }
    buf.writeln('👥 ${trip.travelers} traveler${trip.travelers == 1 ? '' : 's'}');
    buf.writeln();

    if (trip.numDays > 1) {
      // Group by day
      final byDay = <int?, List<TripAttraction>>{};
      for (final a in trip.attractions) {
        byDay.putIfAbsent(a.dayNumber, () => []).add(a);
      }
      // Assigned days first
      final days = byDay.keys.whereType<int>().toList()..sort();
      for (final d in days) {
        buf.writeln('── Day $d ──');
        for (final a in byDay[d]!) {
          final fee = a.entranceFee > 0 ? '₱${a.entranceFee.toStringAsFixed(0)}' : 'Free';
          buf.writeln('  📍 ${a.name} | $fee');
        }
        buf.writeln();
      }
      // Unassigned
      if (byDay.containsKey(null) && byDay[null]!.isNotEmpty) {
        buf.writeln('── Unassigned ──');
        for (final a in byDay[null]!) {
          final fee = a.entranceFee > 0 ? '₱${a.entranceFee.toStringAsFixed(0)}' : 'Free';
          buf.writeln('  📍 ${a.name} | $fee');
        }
        buf.writeln();
      }
    } else {
      for (int i = 0; i < trip.attractions.length; i++) {
        final a = trip.attractions[i];
        final fee = a.entranceFee > 0 ? '₱${a.entranceFee.toStringAsFixed(0)}' : 'Free';
        buf.writeln('${i + 1}. ${a.name} | $fee');
      }
      buf.writeln();
    }

    if (trip.totalCost > 0) {
      buf.writeln('💰 Entrance fees: ₱${trip.totalEntranceFee.toStringAsFixed(0)} × ${trip.travelers} = ₱${trip.totalCost.toStringAsFixed(0)}');
    }
    if (trip.notes.isNotEmpty) {
      buf.writeln();
      buf.writeln('📝 Notes: ${trip.notes}');
    }
    buf.writeln();
    buf.write('Generated by CebuSafeTour 🇵🇭');
    return buf.toString();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(tripProvider.notifier);

    if (trip.attractions.isEmpty) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.map_outlined, size: 72, color: Colors.grey[200]),
          const SizedBox(height: 16),
          Text('No places added yet',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey[400])),
          const SizedBox(height: 8),
          Text('Go to Explore tab to add attractions',
              style: TextStyle(color: Colors.grey[400], fontSize: 13)),
        ]),
      );
    }

    final hasMultiDay = trip.numDays > 1;

    return Stack(children: [
      Column(children: [
        // Summary row
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Wrap(
            spacing: 8,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              _SummaryChip(icon: Icons.place_outlined, label: '${trip.attractions.length} places'),
              if (trip.totalCost > 0)
                _SummaryChip(
                  icon: Icons.attach_money,
                  label: '₱${trip.totalCost.toStringAsFixed(0)}',
                  color: Colors.orange[700]!,
                ),
              if (hasMultiDay)
                _SummaryChip(
                  icon: Icons.calendar_today_outlined,
                  label: '${trip.numDays} days',
                  color: AppTheme.tealColor,
                ),
              Text('Drag to reorder', style: TextStyle(color: Colors.grey[500], fontSize: 11)),
            ],
          ),
        ),
        // Reorderable list
        Expanded(
          child: ReorderableListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
            itemCount: trip.attractions.length,
            onReorder: (oldIndex, newIndex) => notifier.reorder(oldIndex, newIndex),
            itemBuilder: (ctx, i) {
              final a = trip.attractions[i];
              return _ItineraryItem(
                key: ValueKey(a.id),
                attraction: a,
                index: i,
                numDays: hasMultiDay ? trip.numDays : 0,
                onRemove: () => notifier.removeAttraction(a.id),
                onAssignDay: hasMultiDay
                    ? (day) => notifier.assignDay(a.id, day)
                    : null,
              );
            },
          ),
        ),
      ]),
      // Share button
      Positioned(
        bottom: 88,
        left: 16,
        right: 80,
        child: ElevatedButton.icon(
          onPressed: () {
            final text = _buildShareText(trip);
            Share.share(text, subject: trip.name);
          },
          icon: const Icon(Icons.share_outlined, size: 18),
          label: const Text('Share Itinerary'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.tealColor,
            padding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),
      ),
    ]);
  }
}

class _ItineraryItem extends ConsumerWidget {
  final TripAttraction attraction;
  final int index;
  final int numDays; // 0 = single day / no dates set
  final VoidCallback onRemove;
  final ValueChanged<int?>? onAssignDay;

  const _ItineraryItem({
    super.key,
    required this.attraction,
    required this.index,
    required this.numDays,
    required this.onRemove,
    this.onAssignDay,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fee = attraction.entranceFee > 0
        ? '₱${attraction.entranceFee.toStringAsFixed(0)}'
        : 'Free';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(children: [
        // Number badge
        Container(
          width: 40,
          height: 56,
          decoration: BoxDecoration(
            color: AppTheme.primaryColor.withValues(alpha: 0.1),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(12),
              bottomLeft: Radius.circular(12),
            ),
          ),
          child: Center(
            child: Text('${index + 1}',
                style: TextStyle(
                  color: AppTheme.primaryColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                )),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(attraction.name,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              overflow: TextOverflow.ellipsis),
          Row(children: [
            SafetyBadge(status: attraction.safetyStatus, small: true),
            const SizedBox(width: 6),
            Text(fee,
                style: TextStyle(
                  fontSize: 11,
                  color: attraction.entranceFee > 0 ? Colors.orange[700] : Colors.green[700],
                  fontWeight: FontWeight.w600,
                )),
            if (numDays > 0) ...[
              const SizedBox(width: 6),
              _DayChip(
                day: attraction.dayNumber,
                numDays: numDays,
                onChanged: onAssignDay,
              ),
            ],
          ]),
        ])),
        // Remove + drag
        IconButton(
          icon: Icon(Icons.remove_circle_outline, color: Colors.red[400], size: 20),
          onPressed: onRemove,
          tooltip: 'Remove',
        ),
        const Padding(
          padding: EdgeInsets.only(right: 8),
          child: Icon(Icons.drag_handle, color: Colors.grey, size: 20),
        ),
      ]),
    );
  }
}

class _DayChip extends StatelessWidget {
  final int? day;
  final int numDays;
  final ValueChanged<int?>? onChanged;

  const _DayChip({this.day, required this.numDays, this.onChanged});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onChanged == null ? null : () => _showPicker(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: day != null
              ? AppTheme.tealColor.withValues(alpha: 0.12)
              : Colors.grey[100],
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: day != null ? AppTheme.tealColor : Colors.grey[300]!,
          ),
        ),
        child: Text(
          day != null ? 'Day $day' : '+ Day',
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: day != null ? AppTheme.tealColor : Colors.grey[500],
          ),
        ),
      ),
    );
  }

  void _showPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text('Assign to Day', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          ...List.generate(numDays, (i) => ListTile(
            leading: CircleAvatar(
              radius: 14,
              backgroundColor: day == i + 1
                  ? AppTheme.tealColor
                  : Colors.grey[100],
              child: Text('${i + 1}',
                  style: TextStyle(
                    fontSize: 12,
                    color: day == i + 1 ? Colors.white : Colors.black87,
                  )),
            ),
            title: Text('Day ${i + 1}'),
            trailing: day == i + 1
                ? const Icon(Icons.check, color: AppColors.safe)
                : null,
            onTap: () {
              onChanged?.call(i + 1);
              Navigator.pop(context);
            },
          )),
          ListTile(
            leading: CircleAvatar(
              radius: 14,
              backgroundColor: day == null ? Colors.grey[400] : Colors.grey[100],
              child: Icon(Icons.clear, size: 14,
                  color: day == null ? Colors.white : Colors.grey),
            ),
            title: const Text('Unassigned'),
            trailing: day == null ? const Icon(Icons.check, color: AppColors.safe) : null,
            onTap: () {
              onChanged?.call(null);
              Navigator.pop(context);
            },
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }
}

// ─── Budget Card ──────────────────────────────────────────────────────────────

class _BudgetCard extends StatelessWidget {
  final TripPlan trip;
  const _BudgetCard({required this.trip});

  @override
  Widget build(BuildContext context) {
    final paidAttractions = trip.attractions.where((a) => a.entranceFee > 0).toList();
    final freeCount = trip.attractions.length - paidAttractions.length;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF0EA5E9).withValues(alpha: 0.08),
            const Color(0xFF14B8A6).withValues(alpha: 0.08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF0EA5E9).withValues(alpha: 0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.account_balance_wallet_outlined, size: 16, color: AppTheme.primaryColor),
          const SizedBox(width: 6),
          Text('Entrance Fees Only',
              style: TextStyle(color: Colors.grey[600], fontSize: 12)),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: _BudgetStat(
            label: 'Per Person',
            value: trip.totalEntranceFee > 0 ? '₱${trip.totalEntranceFee.toStringAsFixed(0)}' : '₱0',
            color: AppTheme.primaryColor,
          )),
          Container(width: 1, height: 40, color: Colors.grey[200]),
          Expanded(child: _BudgetStat(
            label: 'Total (×${trip.travelers})',
            value: trip.totalCost > 0 ? '₱${trip.totalCost.toStringAsFixed(0)}' : '₱0',
            color: AppTheme.tealColor,
          )),
          Container(width: 1, height: 40, color: Colors.grey[200]),
          Expanded(child: _BudgetStat(
            label: 'Free Places',
            value: '$freeCount',
            color: AppColors.safe,
          )),
        ]),
        if (paidAttractions.isNotEmpty) ...[
          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 8),
          ...paidAttractions.map((a) => Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(children: [
              const Icon(Icons.circle, size: 6, color: Colors.grey),
              const SizedBox(width: 8),
              Expanded(child: Text(a.name,
                  style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis)),
              Text('₱${a.entranceFee.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ]),
          )),
        ],
      ]),
    );
  }
}

class _BudgetStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _BudgetStat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Column(children: [
    Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
    const SizedBox(height: 2),
    Text(label, style: TextStyle(fontSize: 10, color: Colors.grey[600]), textAlign: TextAlign.center),
  ]);
}

// ─── Summary Chip ─────────────────────────────────────────────────────────────

class _SummaryChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _SummaryChip({
    required this.icon,
    required this.label,
    this.color = AppTheme.primaryColor,
  });

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(8),
    ),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 12, color: color),
      const SizedBox(width: 4),
      Text(label, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w600)),
    ]),
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final IconData icon;
  final String label;
  const _SectionLabel({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) => Row(children: [
    Icon(icon, size: 16, color: AppTheme.primaryColor),
    const SizedBox(width: 6),
    Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
  ]);
}

// ─── Date Button ──────────────────────────────────────────────────────────────

class _DateButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool hasValue;
  final VoidCallback onTap;

  const _DateButton({
    required this.label,
    required this.icon,
    required this.hasValue,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
    onPressed: onTap,
    icon: Icon(icon, size: 16,
        color: hasValue ? AppTheme.primaryColor : Colors.grey),
    label: Text(label,
        style: TextStyle(
          fontSize: 13,
          color: hasValue ? AppTheme.primaryColor : Colors.grey,
        )),
    style: OutlinedButton.styleFrom(
      padding: const EdgeInsets.symmetric(vertical: 12),
      side: BorderSide(
        color: hasValue ? AppTheme.primaryColor : const Color(0xFFD1D5DB),
      ),
    ),
  );
}
