import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../l10n/app_localizations.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';

class EmergencyScreen extends StatefulWidget {
  const EmergencyScreen({super.key});

  @override
  State<EmergencyScreen> createState() => _EmergencyScreenState();
}

class _EmergencyScreenState extends State<EmergencyScreen>
    with SingleTickerProviderStateMixin {
  String? _selectedType;
  bool _reporting = false;
  Position? _position;

  Map<String, List<Map<String, dynamic>>> _services = {};
  bool _servicesLoading = true;
  bool _servicesFailed  = false;

  late final TabController _tabController;
  List<Map<String, dynamic>> _incidents = [];
  bool _loadingIncidents = false;
  String _filter = 'new';

  static const _types = [
    {'type': 'medical',          'icon': '🏥', 'label': 'Medical Emergency', 'color': Color(0xFF0EA5E9)},
    {'type': 'fire',             'icon': '🔥', 'label': 'Fire / Disaster',   'color': Color(0xFFEF4444)},
    {'type': 'crime',            'icon': '🚔', 'label': 'Crime / Theft',     'color': Color(0xFF8B5CF6)},
    {'type': 'natural_disaster', 'icon': '🌊', 'label': 'Natural Disaster',  'color': Color(0xFF06B6D4)},
    {'type': 'lost_person',      'icon': '🆘', 'label': 'Lost / Missing',    'color': Color(0xFFF97316)},
  ];

  static const _categoryConfig = {
    'hospitals':  ('🏥', 'Hospitals',         Color(0xFF0EA5E9)),
    'police':     ('🚔', 'Police Stations',   Color(0xFF8B5CF6)),
    'fire':       ('🔥', 'Fire Stations',     Color(0xFFEF4444)),
    'redCross':   ('🩸', 'Red Cross',         Color(0xFFDC2626)),
    'cdrrmo':     ('⛑️', 'DRRMO / CDRRMO',   Color(0xFFF59E0B)),
    'coastGuard': ('⚓', 'Coast Guard',        Color(0xFF06B6D4)),
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (_tabController.index == 1 && _incidents.isEmpty) _fetchIncidents();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchServices());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _getLocation() async {
    try {
      final permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
      _position = await Geolocator.getCurrentPosition();
    } catch (_) {}
  }

  Future<void> _fetchServices() async {
    if (!mounted) return;
    setState(() { _servicesLoading = true; _servicesFailed = false; });
    try {
      await _getLocation();
      final params = _position != null
          ? {'lat': _position!.latitude, 'lng': _position!.longitude, 'radius': 20}
          : <String, dynamic>{};
      final res = await ApiService().get('/emergency/services', params: params);
      final raw = (res.data['services'] as Map<String, dynamic>? ?? {});
      if (mounted) {
        setState(() {
          _services = raw.map(
            (k, v) => MapEntry(k, List<Map<String, dynamic>>.from(v as List)),
          );
        });
      }
    } catch (_) {
      if (mounted) setState(() => _servicesFailed = true);
    } finally {
      if (mounted) setState(() => _servicesLoading = false);
    }
  }

  Future<void> _reportIncident(String type) async {
    final l = AppLocalizations.of(context);
    setState(() { _selectedType = type; _reporting = true; });
    await _getLocation();
    try {
      await ApiService().post('/emergency/incidents', data: {
        'type': type,
        'latitude':  _position?.latitude  ?? 10.3157,
        'longitude': _position?.longitude ?? 123.8854,
        'description': 'Emergency reported via CebuSafeTour app',
      });
      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Help Is On The Way'),
            content: const Text(
                'Your emergency has been reported. Nearby emergency services have been notified.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.ok)),
            ],
          ),
        );
        _fetchIncidents();
        _tabController.animateTo(1);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('Failed to send report. Please try again.'),
          backgroundColor: const Color(0xFFEF4444),
        ));
      }
    } finally {
      if (mounted) setState(() => _reporting = false);
    }
  }

  Future<void> _fetchIncidents() async {
    if (!mounted) return;
    setState(() => _loadingIncidents = true);
    try {
      final res = await ApiService().get('/emergency/incidents/mine');
      final data = res.data as Map<String, dynamic>;
      if (mounted) {
        setState(() {
          _incidents = List<Map<String, dynamic>>.from(data['incidents'] ?? []);
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingIncidents = false);
    }
  }

  List<Map<String, dynamic>> get _filteredIncidents =>
      _incidents.where((i) => i['status'] == _filter).toList();

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: const Color(0xFFFFF1F2),
      appBar: AppBar(
        backgroundColor: const Color(0xFFEF4444),
        foregroundColor: Colors.white,
        title: Text('🚨 ${l.emergency}'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: [
            Tab(icon: const Icon(Icons.report_problem_outlined), text: l.reportIncident),
            Tab(icon: const Icon(Icons.list_alt_outlined), text: l.incidents),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [_buildReportTab(l), _buildIncidentsTab(l)],
      ),
    );
  }

  Widget _buildReportTab(AppLocalizations l) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        // Alert banner
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
              color: const Color(0xFFEF4444),
              borderRadius: BorderRadius.circular(16)),
          child: Column(children: [
            const Text('EMERGENCY HELP',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20)),
            const SizedBox(height: 4),
            const Text(
              'Select your emergency type below.\nYour GPS location will be shared automatically.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
          ]),
        ),
        const SizedBox(height: 20),
        const Text('Select Emergency Type',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),

        ..._types.map((t) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Material(
            color: (t['color'] as Color).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              onTap: _reporting ? null : () => _reportIncident(t['type'] as String),
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Row(children: [
                  Text(t['icon'] as String, style: const TextStyle(fontSize: 32)),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(t['label'] as String,
                        style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                            color: t['color'] as Color)),
                  ),
                  if (_reporting && _selectedType == t['type'])
                    const SizedBox(width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))
                  else
                    Icon(Icons.chevron_right, color: t['color'] as Color),
                ]),
              ),
            ),
          ),
        )),

        const SizedBox(height: 24),

        Row(children: [
          Flexible(
            child: Text(l.nearbyServices,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          const Spacer(),
          if (_position != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF10B981), width: 1),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: const [
                Icon(Icons.location_on, size: 12, color: Color(0xFF10B981)),
                SizedBox(width: 3),
                Text('Within 20 km', style: TextStyle(fontSize: 11, color: Color(0xFF10B981), fontWeight: FontWeight.w600)),
              ]),
            ),
          IconButton(
            icon: const Icon(Icons.refresh, size: 18),
            onPressed: _fetchServices,
            tooltip: l.refresh,
            color: Colors.grey,
            padding: const EdgeInsets.all(8),
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
          ),
        ]),
        const SizedBox(height: 12),

        if (_servicesLoading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (_servicesFailed || _services.isEmpty)
          _buildFallbackContacts()
        else
          _buildCategorizedContacts(),
      ]),
    );
  }

  Widget _buildCategorizedContacts() {
    final categories = _categoryConfig.keys
        .where((k) => (_services[k]?.isNotEmpty ?? false))
        .toList();

    if (categories.isEmpty) return _buildFallbackContacts();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: categories.map((key) {
        final cfg   = _categoryConfig[key]!;
        final items = _services[key]!;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 6, top: 4),
              child: Row(children: [
                Text(cfg.$1, style: const TextStyle(fontSize: 16)),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(cfg.$2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: cfg.$3)),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: cfg.$3.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text('${items.length}',
                      style: TextStyle(fontSize: 11, color: cfg.$3, fontWeight: FontWeight.bold)),
                ),
              ]),
            ),
            ...items.map((c) => _buildServiceTile(c, cfg.$3)),
            const SizedBox(height: 12),
          ],
        );
      }).toList(),
    );
  }

  Widget _buildServiceTile(Map<String, dynamic> c, Color color) {
    final distance = c['distance'] as num?;
    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => launchUrl(Uri.parse('tel:${c['phone']}')),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(children: [
            Icon(Icons.phone, color: color, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(c['name'] as String,
                    overflow: TextOverflow.ellipsis, maxLines: 2,
                    style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                Text(c['phone'] as String,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ]),
            ),
            if (distance != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('$distance km',
                    style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
              ),
          ]),
        ),
      ),
    );
  }

  Widget _buildFallbackContacts() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_servicesFailed)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(children: const [
              Icon(Icons.wifi_off, size: 14, color: Colors.grey),
              SizedBox(width: 4),
              Text('Showing offline contacts', style: TextStyle(fontSize: 12, color: Colors.grey)),
            ]),
          ),
        ...AppConstants.emergencyContacts.map((c) => Card(
          margin: const EdgeInsets.only(bottom: 6),
          child: ListTile(
            leading: const Icon(Icons.phone, color: Color(0xFF10B981)),
            title: Text(c['name']!, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w500)),
            trailing: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 130),
              child: Text(c['number']!, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            ),
            onTap: () => launchUrl(Uri.parse('tel:${c['number']}')),
          ),
        )),
      ],
    );
  }

  Widget _buildIncidentsTab(AppLocalizations l) {
    return Column(children: [
      _buildCountBar(l),
      Container(
        color: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(children: [
          Expanded(child: _filterChip('New',         'new',         const Color(0xFF0EA5E9))),
          const SizedBox(width: 6),
          Expanded(child: _filterChip('In Progress', 'in_progress', const Color(0xFFF59E0B))),
          const SizedBox(width: 6),
          Expanded(child: _filterChip('Resolved',    'resolved',    const Color(0xFF10B981))),
          const SizedBox(width: 4),
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: _fetchIncidents,
            tooltip: l.refresh,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
        ]),
      ),
      const Divider(height: 1),
      Expanded(
        child: _loadingIncidents
            ? const Center(child: CircularProgressIndicator())
            : _filteredIncidents.isEmpty
                ? _buildEmptyState(l)
                : RefreshIndicator(
                    onRefresh: _fetchIncidents,
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _filteredIncidents.length,
                      itemBuilder: (_, i) => _buildIncidentCard(_filteredIncidents[i]),
                    ),
                  ),
      ),
    ]);
  }

  Widget _buildCountBar(AppLocalizations l) {
    final counts = {
      'new':         _incidents.where((i) => i['status'] == 'new').length,
      'in_progress': _incidents.where((i) => i['status'] == 'in_progress').length,
      'resolved':    _incidents.where((i) => i['status'] == 'resolved').length,
    };
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
        _countBadge('New',         counts['new']!,         const Color(0xFF0EA5E9)),
        _verticalDivider(),
        _countBadge('In Progress', counts['in_progress']!, const Color(0xFFF59E0B)),
        _verticalDivider(),
        _countBadge('Resolved',    counts['resolved']!,    const Color(0xFF10B981)),
      ]),
    );
  }

  Widget _verticalDivider() =>
      Container(width: 1, height: 32, color: Colors.grey.shade200);

  Widget _countBadge(String label, int count, Color color) =>
      Column(children: [
        Text('$count', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: TextStyle(fontSize: 11, color: color.withValues(alpha: 0.8))),
      ]);

  Widget _filterChip(String label, String value, Color color) {
    final selected = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? color : color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color, width: 1.5),
        ),
        child: Text(
          label,
          overflow: TextOverflow.ellipsis,
          maxLines: 1,
          style: TextStyle(
            color: selected ? Colors.white : color,
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(AppLocalizations l) {
    final map = {
      'new':         ('📋', 'No new incidents'),
      'in_progress': ('🔄', 'No incidents in progress'),
      'resolved':    ('✅', 'No resolved incidents yet'),
    };
    final (emoji, text) = map[_filter]!;
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(emoji, style: const TextStyle(fontSize: 48)),
        const SizedBox(height: 12),
        Text(text, style: const TextStyle(fontSize: 16, color: Colors.grey)),
        const SizedBox(height: 8),
        TextButton.icon(
          onPressed: _fetchIncidents,
          icon: const Icon(Icons.refresh),
          label: Text(l.refresh),
        ),
      ]),
    );
  }

  Widget _buildIncidentCard(Map<String, dynamic> incident) {
    final status  = incident['status']  as String? ?? 'new';
    final type    = incident['type']    as String? ?? 'unknown';
    final created = incident['createdAt'] != null
        ? DateTime.tryParse(incident['createdAt'].toString())
        : null;
    final resolved = incident['resolvedAt'] != null
        ? DateTime.tryParse(incident['resolvedAt'].toString())
        : null;

    const statusConfig = {
      'new':         (Color(0xFF0EA5E9), Icons.fiber_new,      'New'),
      'in_progress': (Color(0xFFF59E0B), Icons.hourglass_top,  'In Progress'),
      'resolved':    (Color(0xFF10B981), Icons.check_circle,   'Resolved'),
    };
    final cfg = statusConfig[status] ?? (Colors.grey, Icons.help_outline, status);
    final (color, iconData, statusLabel) = cfg;

    const typeEmojis = {
      'medical': '🏥', 'fire': '🔥', 'crime': '🚔',
      'natural_disaster': '🌊', 'lost_person': '🆘',
    };

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: color.withValues(alpha: 0.3), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(typeEmojis[type] ?? '⚠️', style: const TextStyle(fontSize: 24)),
            const SizedBox(width: 10),
            Expanded(
              child: Text(type.replaceAll('_', ' ').toUpperCase(),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(iconData, size: 14, color: color),
                const SizedBox(width: 4),
                Text(statusLabel,
                    style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12)),
              ]),
            ),
          ]),

          if (incident['description'] != null) ...[
            const SizedBox(height: 8),
            Text(incident['description'].toString(),
                style: const TextStyle(fontSize: 13, color: Colors.black54)),
          ],

          const SizedBox(height: 8),
          Row(children: [
            const Icon(Icons.access_time, size: 14, color: Colors.grey),
            const SizedBox(width: 4),
            Text(
              created != null
                  ? DateFormat('MMM d, y · h:mm a').format(created.toLocal())
                  : '—',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ]),

          if (resolved != null) ...[
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.check_circle_outline, size: 14, color: Color(0xFF10B981)),
              const SizedBox(width: 4),
              Text(
                'Resolved ${DateFormat('MMM d, y').format(resolved.toLocal())}',
                style: const TextStyle(fontSize: 12, color: Color(0xFF10B981)),
              ),
            ]),
          ],
        ]),
      ),
    );
  }
}
