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

class _TripPlannerScreenState extends ConsumerState<TripPlannerScreen> {
  @override
  Widget build(BuildContext context) {
    final trip = ref.watch(tripProvider);
    final l    = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.tripPlanner),
        actions: [
          if (trip.attractions.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.share_outlined),
              tooltip: 'Share itinerary',
              onPressed: () => _share(trip),
            ),
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
      ),
      body: Stack(children: [
        CustomScrollView(
          slivers: [
            // ── Trip header ────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: _TripHeaderCard(trip: trip),
            ),

            // ── "Places to Visit" section header ───────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 8, 4),
                child: Row(children: [
                  const Icon(Icons.place_outlined, size: 18, color: AppTheme.primaryColor),
                  const SizedBox(width: 6),
                  const Text('Places to Visit',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(width: 8),
                  if (trip.attractions.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text('${trip.attractions.length}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          )),
                    ),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: () => _showAddPlaces(context, trip),
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Add Place'),
                    style: TextButton.styleFrom(
                      foregroundColor: AppTheme.primaryColor,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    ),
                  ),
                ]),
              ),
            ),

            // ── Empty state ────────────────────────────────────────────────
            if (trip.attractions.isEmpty)
              SliverToBoxAdapter(
                child: _EmptyPlacesCard(
                  onAdd: () => _showAddPlaces(context, trip),
                ),
              )
            else ...[
              // ── Reorderable places list ────────────────────────────────
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                sliver: SliverReorderableList(
                  itemCount: trip.attractions.length,
                  onReorder: (oldIndex, newIndex) =>
                      ref.read(tripProvider.notifier).reorder(oldIndex, newIndex),
                  proxyDecorator: (child, _, animation) => AnimatedBuilder(
                    animation: animation,
                    builder: (_, __) => Material(
                      elevation: 6,
                      borderRadius: BorderRadius.circular(12),
                      shadowColor: Colors.black26,
                      child: child,
                    ),
                  ),
                  itemBuilder: (ctx, i) {
                    final a = trip.attractions[i];
                    return _ItineraryItem(
                      key: ValueKey(a.id),
                      attraction: a,
                      index: i,
                      numDays: trip.numDays > 1 ? trip.numDays : 0,
                      onRemove: () =>
                          ref.read(tripProvider.notifier).removeAttraction(a.id),
                      onAssignDay: trip.numDays > 1
                          ? (day) =>
                              ref.read(tripProvider.notifier).assignDay(a.id, day)
                          : null,
                    );
                  },
                ),
              ),

              // ── Budget summary ─────────────────────────────────────────
              if (trip.totalCost > 0)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: _BudgetCard(trip: trip),
                  ),
                ),
            ],

            // ── Notes ──────────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: _NotesSection(trip: trip),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 110)),
          ],
        ),
        const Positioned(bottom: 24, right: 24, child: EmergencyFab()),
      ]),
    );
  }

  void _share(TripPlan trip) {
    final text = _buildShareText(trip);
    SharePlus.instance.share(ShareParams(text: text, subject: trip.name));
  }

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
      final byDay = <int?, List<TripAttraction>>{};
      for (final a in trip.attractions) {
        byDay.putIfAbsent(a.dayNumber, () => []).add(a);
      }
      final days = byDay.keys.whereType<int>().toList()..sort();
      for (final d in days) {
        buf.writeln('── Day $d ──');
        for (final a in byDay[d]!) {
          final fee = a.entranceFee > 0 ? '₱${a.entranceFee.toStringAsFixed(0)}' : 'Free';
          buf.writeln('  📍 ${a.name} | $fee');
        }
        buf.writeln();
      }
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
      buf.writeln('💰 Fees: ₱${trip.totalEntranceFee.toStringAsFixed(0)} × ${trip.travelers} = ₱${trip.totalCost.toStringAsFixed(0)}');
    }
    if (trip.notes.isNotEmpty) {
      buf.writeln();
      buf.writeln('📝 ${trip.notes}');
    }
    buf.writeln();
    buf.write('Shared via CebuSafeTour 🇵🇭');
    return buf.toString();
  }

  Future<void> _showAddPlaces(BuildContext context, TripPlan trip) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _AddPlacesSheet(),
    );
  }

  Future<void> _confirmNewTrip(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
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
      if (mounted) {
        messenger.showSnackBar(
          const SnackBar(content: Text('New trip started!')),
        );
      }
    }
  }

  Future<void> _showMyTrips(BuildContext context) async {
    final notifier = ref.read(tripProvider.notifier);
    final trips    = await notifier.loadAllTrips();
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _MyTripsSheet(trips: trips, notifier: notifier),
    );
  }
}

// ─── Trip Header Card ─────────────────────────────────────────────────────────

class _TripHeaderCard extends ConsumerStatefulWidget {
  final TripPlan trip;
  const _TripHeaderCard({required this.trip});

  @override
  ConsumerState<_TripHeaderCard> createState() => _TripHeaderCardState();
}

class _TripHeaderCardState extends ConsumerState<_TripHeaderCard> {
  late final TextEditingController _nameCtrl;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.trip.name);
  }

  @override
  void didUpdateWidget(_TripHeaderCard old) {
    super.didUpdateWidget(old);
    if (old.trip.id != widget.trip.id) {
      _nameCtrl.text = widget.trip.name;
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool isStart) async {
    final trip    = widget.trip;
    final notifier = ref.read(tripProvider.notifier);
    final now     = DateTime.now();
    final initial = isStart
        ? (trip.startDate ?? now)
        : (trip.endDate ?? (trip.startDate ?? now));
    final first = isStart ? now : (trip.startDate ?? now);

    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(first) ? first : initial,
      firstDate: first,
      lastDate: now.add(const Duration(days: 730)),
    );
    if (picked == null || !mounted) return;

    if (isStart) {
      final end = trip.endDate;
      await notifier.setDates(picked, end != null && end.isBefore(picked) ? picked : end);
    } else {
      await notifier.setDates(trip.startDate, picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip     = ref.watch(tripProvider);
    final notifier = ref.read(tripProvider.notifier);
    final fmt      = DateFormat('MMM d');

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor.withValues(alpha: 0.06),
            AppTheme.tealColor.withValues(alpha: 0.06),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.15),
        ),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Trip name
        Row(children: [
          const Icon(Icons.luggage_outlined, size: 18, color: AppTheme.primaryColor),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: _nameCtrl,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
              decoration: const InputDecoration(
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
                hintText: 'Trip name…',
              ),
              textInputAction: TextInputAction.done,
              onSubmitted: (v) => notifier.setName(v),
              onTapOutside: (_) => notifier.setName(_nameCtrl.text),
            ),
          ),
          Icon(Icons.edit_outlined, size: 14, color: Colors.grey[400]),
        ]),
        const SizedBox(height: 14),

        // Dates row
        Row(children: [
          Expanded(
            child: _HeaderDateButton(
              icon: Icons.flight_takeoff_outlined,
              label: trip.startDate != null ? fmt.format(trip.startDate!) : 'Start date',
              hasValue: trip.startDate != null,
              onTap: () => _pickDate(true),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Icon(Icons.arrow_forward, size: 14, color: Colors.grey[400]),
          ),
          Expanded(
            child: _HeaderDateButton(
              icon: Icons.flight_land_outlined,
              label: trip.endDate != null ? fmt.format(trip.endDate!) : 'End date',
              hasValue: trip.endDate != null,
              onTap: () => _pickDate(false),
            ),
          ),
          if (trip.numDays > 0) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.tealColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${trip.numDays}d',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.tealColor,
                ),
              ),
            ),
          ],
        ]),
        const SizedBox(height: 10),

        // Travelers row
        Row(children: [
          Icon(Icons.group_outlined, size: 16, color: Colors.grey[600]),
          const SizedBox(width: 6),
          Text(
            '${trip.travelers} traveler${trip.travelers == 1 ? '' : 's'}',
            style: TextStyle(fontSize: 13, color: Colors.grey[700]),
          ),
          const Spacer(),
          _CounterButton(
            icon: Icons.remove,
            onPressed: trip.travelers > 1
                ? () => notifier.setTravelers(trip.travelers - 1)
                : null,
          ),
          const SizedBox(width: 4),
          Text('${trip.travelers}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(width: 4),
          _CounterButton(
            icon: Icons.add,
            onPressed: () => notifier.setTravelers(trip.travelers + 1),
          ),
        ]),
      ]),
    );
  }
}

class _HeaderDateButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool hasValue;
  final VoidCallback onTap;

  const _HeaderDateButton({
    required this.icon,
    required this.label,
    required this.hasValue,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: hasValue
                ? AppTheme.primaryColor.withValues(alpha: 0.4)
                : const Color(0xFFE5E7EB),
          ),
        ),
        child: Row(children: [
          Icon(icon, size: 14,
              color: hasValue ? AppTheme.primaryColor : Colors.grey[400]),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: hasValue ? FontWeight.w600 : FontWeight.normal,
                color: hasValue ? AppTheme.primaryColor : Colors.grey[500],
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ]),
      ),
    );
  }
}

class _CounterButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  const _CounterButton({required this.icon, this.onPressed});

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 28, height: 28,
    child: IconButton(
      padding: EdgeInsets.zero,
      icon: Icon(icon, size: 16),
      color: onPressed != null ? AppTheme.primaryColor : Colors.grey[300],
      onPressed: onPressed,
    ),
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

class _EmptyPlacesCard extends StatelessWidget {
  final VoidCallback onAdd;
  const _EmptyPlacesCard({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 24),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFE5E7EB),
          style: BorderStyle.solid,
        ),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.map_outlined, size: 56, color: Colors.grey[300]),
        const SizedBox(height: 12),
        Text(
          'No places added yet',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: Colors.grey[500],
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Search and add the attractions\nyou want to visit in Cebu.',
          style: TextStyle(fontSize: 13, color: Colors.grey[400]),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: onAdd,
          icon: const Icon(Icons.add, size: 18),
          label: const Text('Add First Place'),
          style: FilledButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          ),
        ),
      ]),
    );
  }
}

// ─── Itinerary Item ───────────────────────────────────────────────────────────

class _ItineraryItem extends ConsumerWidget {
  final TripAttraction attraction;
  final int index;
  final int numDays;
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
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(children: [
        // Drag handle (left side)
        ReorderableDragStartListener(
          index: index,
          child: Container(
            width: 36,
            height: 60,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.07),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                bottomLeft: Radius.circular(12),
              ),
            ),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(
                '${index + 1}',
                style: TextStyle(
                  color: AppTheme.primaryColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
              Icon(Icons.drag_handle, size: 14, color: Colors.grey[400]),
            ]),
          ),
        ),
        const SizedBox(width: 10),
        // Content
        Expanded(child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              attraction.name,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Row(children: [
              SafetyBadge(status: attraction.safetyStatus, small: true),
              const SizedBox(width: 6),
              Text(
                fee,
                style: TextStyle(
                  fontSize: 11,
                  color: attraction.entranceFee > 0 ? Colors.orange[700] : Colors.green[700],
                  fontWeight: FontWeight.w600,
                ),
              ),
              // Day assignment chip — only when multi-day trip
              if (numDays > 0) ...[
                const SizedBox(width: 6),
                _DayChip(
                  day: attraction.dayNumber,
                  numDays: numDays,
                  onChanged: onAssignDay,
                ),
              ],
            ]),
          ]),
        )),
        // Remove button
        IconButton(
          icon: Icon(Icons.remove_circle_outline, color: Colors.red[300], size: 20),
          onPressed: onRemove,
          tooltip: 'Remove',
          padding: const EdgeInsets.symmetric(horizontal: 8),
        ),
      ]),
    );
  }
}

// ─── Day chip ─────────────────────────────────────────────────────────────────

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
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
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
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text('Assign to Day',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          ...List.generate(numDays, (i) => ListTile(
            dense: true,
            leading: CircleAvatar(
              radius: 14,
              backgroundColor: day == i + 1 ? AppTheme.tealColor : Colors.grey[100],
              child: Text('${i + 1}',
                  style: TextStyle(
                    fontSize: 12,
                    color: day == i + 1 ? Colors.white : Colors.black87,
                  )),
            ),
            title: Text('Day ${i + 1}'),
            trailing: day == i + 1 ? const Icon(Icons.check, color: AppColors.safe, size: 18) : null,
            onTap: () { onChanged?.call(i + 1); Navigator.pop(context); },
          )),
          ListTile(
            dense: true,
            leading: CircleAvatar(
              radius: 14,
              backgroundColor: day == null ? Colors.grey[400] : Colors.grey[100],
              child: Icon(Icons.clear, size: 14,
                  color: day == null ? Colors.white : Colors.grey),
            ),
            title: const Text('No day assigned'),
            trailing: day == null ? const Icon(Icons.check, color: AppColors.safe, size: 18) : null,
            onTap: () { onChanged?.call(null); Navigator.pop(context); },
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
            const Color(0xFF0EA5E9).withValues(alpha: 0.07),
            const Color(0xFF14B8A6).withValues(alpha: 0.07),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF0EA5E9).withValues(alpha: 0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.account_balance_wallet_outlined, size: 15, color: AppTheme.primaryColor),
          const SizedBox(width: 6),
          Text('Budget Estimate',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey[700])),
          const SizedBox(width: 4),
          Text('(entrance fees only)',
              style: TextStyle(fontSize: 11, color: Colors.grey[500])),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: _BudgetStat(
            label: 'Per Person',
            value: '₱${trip.totalEntranceFee.toStringAsFixed(0)}',
            color: AppTheme.primaryColor,
          )),
          Container(width: 1, height: 36, color: Colors.grey[200]),
          Expanded(child: _BudgetStat(
            label: '× ${trip.travelers} travelers',
            value: '₱${trip.totalCost.toStringAsFixed(0)}',
            color: AppTheme.tealColor,
          )),
          Container(width: 1, height: 36, color: Colors.grey[200]),
          Expanded(child: _BudgetStat(
            label: 'Free Entries',
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
              const Icon(Icons.circle, size: 5, color: Colors.grey),
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
    Text(value, style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: color)),
    const SizedBox(height: 2),
    Text(label, style: TextStyle(fontSize: 10, color: Colors.grey[600]), textAlign: TextAlign.center),
  ]);
}

// ─── Notes Section ────────────────────────────────────────────────────────────

class _NotesSection extends ConsumerStatefulWidget {
  final TripPlan trip;
  const _NotesSection({required this.trip});

  @override
  ConsumerState<_NotesSection> createState() => _NotesSectionState();
}

class _NotesSectionState extends ConsumerState<_NotesSection> {
  late final TextEditingController _ctrl;
  bool _expanded = false;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.trip.notes);
    if (widget.trip.notes.isNotEmpty) _expanded = true;
  }

  @override
  void didUpdateWidget(_NotesSection old) {
    super.didUpdateWidget(old);
    if (old.trip.id != widget.trip.id) {
      _ctrl.text = widget.trip.notes;
      setState(() => _expanded = widget.trip.notes.isNotEmpty);
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final notifier = ref.read(tripProvider.notifier);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(children: [
              Icon(Icons.notes_outlined, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 8),
              Text('Trip Notes',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: Colors.grey[700],
                  )),
              if (!_expanded && widget.trip.notes.isNotEmpty) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    widget.trip.notes,
                    style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
              const Spacer(),
              Icon(
                _expanded ? Icons.expand_less : Icons.expand_more,
                size: 18,
                color: Colors.grey[500],
              ),
            ]),
          ),
        ),
        if (_expanded) ...[
          const SizedBox(height: 8),
          TextField(
            controller: _ctrl,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'Reminders, packing list, tips…',
              hintStyle: TextStyle(color: Colors.grey[400]),
              alignLabelWithHint: true,
              filled: true,
              fillColor: Colors.grey[50],
            ),
            onChanged: (v) => notifier.setNotes(v),
          ),
        ],
      ]),
    );
  }
}

// ─── Add Places Bottom Sheet ──────────────────────────────────────────────────

class _AddPlacesSheet extends ConsumerStatefulWidget {
  const _AddPlacesSheet();

  @override
  ConsumerState<_AddPlacesSheet> createState() => _AddPlacesSheetState();
}

class _AddPlacesSheetState extends ConsumerState<_AddPlacesSheet> {
  String _search   = '';
  String _category = 'all';
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final trip     = ref.watch(tripProvider);
    final notifier = ref.read(tripProvider.notifier);
    final allAsync = ref.watch(attractionsProvider('limit=200'));
    final addedCount = trip.attractions.length;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.88,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 6),
            width: 36, height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Row(children: [
              const Text('Add Places',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
              const Spacer(),
              if (addedCount > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text('$addedCount in trip',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.w600,
                      )),
                ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Done'),
              ),
            ]),
          ),

          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: TextField(
              controller: _searchCtrl,
              autofocus: false,
              decoration: InputDecoration(
                hintText: 'Search attractions…',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _search.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _search = '');
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                isDense: true,
              ),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),

          // Category chips
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final (code, label, emoji) = _categories[i];
                final selected = _category == code;
                return FilterChip(
                  label: Text('$emoji $label', style: const TextStyle(fontSize: 12)),
                  selected: selected,
                  onSelected: (_) => setState(() => _category = code),
                  backgroundColor: Colors.white,
                  selectedColor: AppTheme.primaryColor.withValues(alpha: 0.14),
                  checkmarkColor: AppTheme.primaryColor,
                  side: BorderSide(
                    color: selected ? AppTheme.primaryColor : const Color(0xFFE5E7EB),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  visualDensity: VisualDensity.compact,
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          const Divider(height: 1),

          // Attractions list
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
                      Icon(Icons.search_off, size: 40, color: Colors.grey[300]),
                      const SizedBox(height: 8),
                      Text('No attractions found',
                          style: TextStyle(color: Colors.grey[500])),
                    ]),
                  );
                }

                return ListView.separated(
                  controller: scrollCtrl,
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (ctx, i) {
                    final a       = filtered[i];
                    final inTrip  = trip.attractions.any((t) => t.id == a.id);
                    return _AttractionPickerCard(
                      attraction: a,
                      inTrip: inTrip,
                      onToggle: () => notifier.toggleAttraction(a),
                    );
                  },
                );
              },
            ),
          ),
        ]),
      ),
    );
  }
}

class _AttractionPickerCard extends StatelessWidget {
  final Attraction attraction;
  final bool inTrip;
  final VoidCallback onToggle;

  const _AttractionPickerCard({
    required this.attraction,
    required this.inTrip,
    required this.onToggle,
  });

  String get _emoji => switch (attraction.category) {
    'beach'    => '🏖️',
    'mountain' => '⛰️',
    'heritage' => '🏛️',
    'museum'   => '🏺',
    'park'     => '🌿',
    'waterfall'=> '💧',
    'market'   => '🛒',
    'church'   => '⛪',
    'resort'   => '🏨',
    _          => '📍',
  };

  @override
  Widget build(BuildContext context) {
    final fee = attraction.entranceFee > 0
        ? '₱${attraction.entranceFee.toStringAsFixed(0)}'
        : 'Free';

    return GestureDetector(
      onTap: onToggle,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: inTrip
              ? AppTheme.primaryColor.withValues(alpha: 0.05)
              : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: inTrip ? AppTheme.primaryColor : const Color(0xFFE5E7EB),
            width: inTrip ? 1.5 : 1,
          ),
        ),
        child: Row(children: [
          // Category icon
          Container(
            width: 38, height: 38,
            decoration: BoxDecoration(
              color: const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(child: Text(_emoji, style: const TextStyle(fontSize: 17))),
          ),
          const SizedBox(width: 10),
          // Info
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(attraction.name,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 3),
            Row(children: [
              SafetyBadge(status: attraction.safetyStatus, small: true),
              const SizedBox(width: 6),
              Text(fee,
                  style: TextStyle(
                    color: attraction.entranceFee > 0 ? Colors.orange[700] : Colors.green[700],
                    fontSize: 11, fontWeight: FontWeight.w600,
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
          ])),
          const SizedBox(width: 8),
          // Toggle button
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: 34, height: 34,
            decoration: BoxDecoration(
              color: inTrip ? AppTheme.primaryColor : Colors.grey[100],
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              inTrip ? Icons.check : Icons.add,
              color: inTrip ? Colors.white : Colors.grey[600],
              size: 18,
            ),
          ),
        ]),
      ),
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
          decoration: BoxDecoration(
              color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(children: [
            const Text('My Trips',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const Spacer(),
            Text('${_trips.length} trip${_trips.length == 1 ? '' : 's'}',
                style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          ]),
        ),
        const Divider(height: 1),
        if (_trips.isEmpty)
          Expanded(
            child: Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.luggage_outlined, size: 48, color: Colors.grey[300]),
                const SizedBox(height: 12),
                Text('No saved trips yet',
                    style: TextStyle(color: Colors.grey[500])),
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
                    child: Icon(Icons.luggage_outlined,
                        color: isActive ? AppTheme.primaryColor : Colors.grey),
                  ),
                  title: Text(t.name,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    if (t.startDate != null)
                      Text(
                        '${fmt.format(t.startDate!)}${t.endDate != null ? ' → ${fmt.format(t.endDate!)}' : ''}',
                        style: const TextStyle(fontSize: 12),
                      ),
                    Text('${t.attractions.length} places · ${t.travelers} traveler${t.travelers == 1 ? '' : 's'}',
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
                            icon: Icon(Icons.delete_outline,
                                size: 20, color: Colors.red[400]),
                            tooltip: 'Delete',
                            onPressed: () async {
                              final ok = await showDialog<bool>(
                                context: ctx,
                                builder: (d) => AlertDialog(
                                  title: const Text('Delete Trip?'),
                                  content: Text('Delete "${t.name}"?'),
                                  actions: [
                                    TextButton(
                                        onPressed: () => Navigator.pop(d, false),
                                        child: const Text('Cancel')),
                                    TextButton(
                                        onPressed: () => Navigator.pop(d, true),
                                        child: const Text('Delete',
                                            style: TextStyle(color: Colors.red))),
                                  ],
                                ),
                              );
                              if (ok == true) {
                                await widget.notifier.deleteTrip(t.id);
                                setState(
                                    () => _trips.removeWhere((x) => x.id == t.id));
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
