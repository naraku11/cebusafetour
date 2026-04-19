import 'dart:io';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen>
    with SingleTickerProviderStateMixin {
  bool _uploading = false;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _changePhoto() async {
    final l = AppLocalizations.of(context);
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (_) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
            leading: const Icon(Icons.camera_alt_outlined),
            title: Text(l.takePhoto),
            onTap: () => Navigator.pop(context, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined),
            title: Text(l.chooseFromGallery),
            onTap: () => Navigator.pop(context, ImageSource.gallery),
          ),
        ]),
      ),
    );
    if (source == null) return;

    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 80, maxWidth: 800);
    if (picked == null) return;

    setState(() => _uploading = true);
    try {
      final updatedUser = await ref
          .read(authProvider.notifier)
          .updateProfilePicture(File(picked.path));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(updatedUser != null ? l.profileUpdated : l.failedToUpdate),
        backgroundColor: updatedUser != null ? Colors.green : Colors.red,
      ));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${l.failedToUpdate}: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void _showEditProfile() {
    final l = AppLocalizations.of(context);
    final user = ref.read(authProvider).user;
    final nameCtrl = TextEditingController(text: user?.name ?? '');
    final natCtrl  = TextEditingController(text: user?.nationality ?? '');
    final phoneCtrl = TextEditingController(text: user?.contactNumber ?? '');
    bool saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, setModal) {
        return Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(l.editProfile, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(
              controller: nameCtrl,
              decoration: InputDecoration(labelText: l.fullName, prefixIcon: const Icon(Icons.person_outlined), border: const OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: natCtrl,
              decoration: InputDecoration(labelText: l.nationality, prefixIcon: const Icon(Icons.flag_outlined), border: const OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: l.contactNumber, prefixIcon: const Icon(Icons.phone_outlined), border: const OutlineInputBorder()),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: saving ? null : () async {
                setModal(() => saving = true);
                final ok = await ref.read(authProvider.notifier).updateProfile(
                  name: nameCtrl.text.trim().isEmpty ? null : nameCtrl.text.trim(),
                  nationality: natCtrl.text.trim().isEmpty ? null : natCtrl.text.trim(),
                  contactNumber: phoneCtrl.text.trim().isEmpty ? null : phoneCtrl.text.trim(),
                );
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(ok ? l.profileUpdated : l.failedToUpdate),
                    backgroundColor: ok ? Colors.green : Colors.red,
                  ));
                }
              },
              child: saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(l.saveChanges),
            ),
          ]),
        );
      }),
    );
  }

  void _showEmergencyContacts() {
    final l = AppLocalizations.of(context);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _EmergencyContactsSheet(
        initialContacts: List.from(ref.read(authProvider).user?.emergencyContacts ?? []),
        onSave: (contacts) async {
          final ok = await ref.read(authProvider.notifier).updateProfile(emergencyContacts: contacts);
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(ok ? l.profileUpdated : l.failedToUpdate),
              backgroundColor: ok ? Colors.green : Colors.red,
            ));
          }
          return ok;
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final l = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l.myProfile)),
      body: Column(children: [
        // Profile header
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            gradient: LinearGradient(colors: [Color(0xFF0C4A6E), Color(0xFF0EA5E9)]),
          ),
          child: Column(children: [
            GestureDetector(
              onTap: _uploading ? null : _changePhoto,
              child: Stack(alignment: Alignment.center, children: [
                _buildAvatar(user?.profilePicture, user?.name ?? 'G', radius: 44),
                if (_uploading)
                  Container(
                    width: 88, height: 88,
                    decoration: BoxDecoration(color: Colors.black45, borderRadius: BorderRadius.circular(44)),
                    child: const CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                  ),
                if (!_uploading)
                  Positioned(
                    bottom: 0, right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(5),
                      decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                      child: const Icon(Icons.camera_alt, size: 16, color: Color(0xFF0C4A6E)),
                    ),
                  ),
              ]),
            ),
            if (user?.profilePictureVerified != null) ...[
              const SizedBox(height: 4),
              _VerificationBadge(verified: user!.profilePictureVerified),
            ],
            const SizedBox(height: 10),
            Text(user?.name ?? 'Guest',
                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            Text(user?.email ?? '', style: const TextStyle(color: Colors.white70)),
            if (user?.nationality != null)
              Text('🌍 ${user!.nationality}', style: const TextStyle(color: Colors.white70)),
          ]),
        ),

        // Tab bar
        TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF0EA5E9),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFF0EA5E9),
          tabs: [
            Tab(icon: const Icon(Icons.person_outlined), text: l.account),
            Tab(icon: const Icon(Icons.history_outlined), text: l.incidents),
          ],
        ),

        Expanded(
          child: TabBarView(controller: _tabController, children: [
            _buildAccountTab(user, l),
            _IncidentHistoryTab(userId: user?.id),
          ]),
        ),
      ]),
    );
  }

  Widget _buildAccountTab(user, AppLocalizations l) {
    return ListView(children: [
      ListTile(
        leading: const Icon(Icons.edit_outlined),
        title: Text(l.editProfile),
        subtitle: Text(user?.nationality ?? l.nameNationalityContact),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: _showEditProfile,
      ),
      const Divider(height: 1),

      ListTile(
        leading: const Icon(Icons.emergency_outlined, color: Colors.red),
        title: Text(l.emergencyContacts),
        subtitle: Text(
          user?.emergencyContacts.isEmpty == true
              ? l.noContactsAdded
              : l.contactCount(user!.emergencyContacts.length),
        ),
        trailing: TextButton(
          onPressed: _showEmergencyContacts,
          child: const Text('Manage'),
        ),
      ),
      if (user != null && user.emergencyContacts.isNotEmpty)
        _buildEmergencyContactsPreview(user.emergencyContacts, l),
      const Divider(height: 1),

      Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(l.accountInfo, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
          const SizedBox(height: 8),
          _infoRow(Icons.verified_outlined, l.emailVerified, user?.isVerified == true ? l.yes : l.no),
          _infoRow(Icons.badge_outlined, l.role, user?.role ?? 'tourist'),
          if (user?.contactNumber != null)
            _infoRow(Icons.phone_outlined, l.contact, user!.contactNumber!),
        ]),
      ),
      const Divider(height: 1),

      ListTile(
        leading: const Icon(Icons.help_outline, color: Color(0xFF0EA5E9)),
        title: Text(l.helpAndFaq),
        subtitle: Text(l.helpSearchHint),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: () => context.push('/help'),
      ),
      const Divider(height: 1),

      ListTile(
        leading: const Icon(Icons.logout, color: Colors.red),
        title: Text(l.logOut, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w500)),
        onTap: () async {
          await ref.read(authProvider.notifier).logout();
          if (context.mounted) context.go('/auth/login');
        },
      ),

      const SizedBox(height: 12),
      Center(child: Text('CebuSafeTour v1.0.0', style: const TextStyle(color: Colors.grey, fontSize: 12))),
      const SizedBox(height: 24),
    ]);
  }

  Widget _buildEmergencyContactsPreview(
      List<Map<String, dynamic>> contacts, AppLocalizations l) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Column(
        children: contacts.map((c) {
          final name  = c['name']?.toString() ?? '';
          final phone = c['phone']?.toString() ?? '';
          final rel   = c['relationship']?.toString() ?? '';
          final initials = name.trim().isEmpty
              ? '?'
              : name.trim().split(' ').map((w) => w[0]).take(2).join().toUpperCase();
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: Colors.red.shade100,
                child: Text(initials,
                    style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
              ),
              title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: rel.isNotEmpty ? Text(rel) : null,
              trailing: phone.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.phone, color: Colors.green),
                      onPressed: () => launchUrl(Uri.parse('tel:$phone')),
                    )
                  : null,
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(children: [
      Icon(icon, size: 16, color: Colors.grey),
      const SizedBox(width: 8),
      Text('$label: ', style: const TextStyle(color: Colors.grey, fontSize: 13)),
      Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
    ]),
  );
}

// ── Emergency Contacts Bottom Sheet ─────────────────────────────────────────

class _EmergencyContactsSheet extends StatefulWidget {
  final List<Map<String, dynamic>> initialContacts;
  final Future<bool> Function(List<Map<String, dynamic>>) onSave;
  const _EmergencyContactsSheet({required this.initialContacts, required this.onSave});

  @override
  State<_EmergencyContactsSheet> createState() => _EmergencyContactsSheetState();
}

class _EmergencyContactsSheetState extends State<_EmergencyContactsSheet> {
  late List<Map<String, dynamic>> _contacts;
  bool _saving = false;

  static const _red = Color(0xFFDC2626);
  static const _redLight = Color(0xFFFEF2F2);
  static const _redMid = Color(0xFFFECACA);

  @override
  void initState() {
    super.initState();
    _contacts = List.from(widget.initialContacts);
  }

  String _initials(String name) {
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[parts.length - 1][0]}'.toUpperCase();
  }

  /// Opens an add/edit form. Pass [editIndex] to pre-fill and update an existing contact.
  void _showContactForm({int? editIndex}) {
    final l = AppLocalizations.of(context);
    final existing = editIndex != null ? _contacts[editIndex] : null;
    final nameCtrl  = TextEditingController(text: existing?['name']         as String? ?? '');
    final phoneCtrl = TextEditingController(text: existing?['phone']        as String? ?? '');
    final relCtrl   = TextEditingController(text: existing?['relationship'] as String? ?? '');
    final isEdit = editIndex != null;
    bool hasError = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            // drag handle
            Center(
              child: Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Row(children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: _redLight, borderRadius: BorderRadius.circular(10)),
                child: Icon(
                  isEdit ? Icons.edit_outlined : Icons.person_add_alt_1_rounded,
                  color: _red, size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                isEdit ? 'Edit Contact' : l.addEmergencyContact,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ]),
            const SizedBox(height: 20),
            _styledField(controller: nameCtrl, label: l.fullName, icon: Icons.person_outline),
            const SizedBox(height: 12),
            _styledField(controller: phoneCtrl, label: l.phoneNumber,
                icon: Icons.phone_outlined, keyboardType: TextInputType.phone),
            const SizedBox(height: 12),
            _styledField(
              controller: relCtrl,
              label: '${l.relationship} (optional)',
              icon: Icons.favorite_border_rounded,
            ),
            if (hasError) ...[
              const SizedBox(height: 8),
              const Text(
                'Name and phone number are required.',
                style: TextStyle(color: Colors.red, fontSize: 12),
              ),
            ],
            const SizedBox(height: 24),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: _red,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              icon: Icon(isEdit ? Icons.check_rounded : Icons.add, size: 20),
              label: Text(
                isEdit ? 'Save Changes' : l.done,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
              ),
              onPressed: () {
                final name  = nameCtrl.text.trim();
                final phone = phoneCtrl.text.trim();
                if (name.isEmpty || phone.isEmpty) {
                  setModal(() => hasError = true);
                  return;
                }
                setState(() {
                  final contact = {
                    'name': name,
                    'phone': phone,
                    'relationship': relCtrl.text.trim(),
                  };
                  if (isEdit) {
                    _contacts[editIndex] = contact;
                  } else {
                    _contacts.add(contact);
                  }
                });
                Navigator.pop(ctx);
              },
            ),
          ]),
        ),
      ),
    );
  }

  Future<void> _call(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Widget _actionBtn(IconData icon, Color color, Color bg, VoidCallback onTap) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(7),
          decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, size: 18, color: color),
        ),
      );

  Widget _styledField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
  }) =>
      TextField(
        controller: controller,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, size: 20, color: Colors.grey.shade500),
          filled: true,
          fillColor: Colors.grey.shade50,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade200),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade200),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: _red, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final bottomPad = MediaQuery.of(context).viewInsets.bottom;
    return Container(
      height: MediaQuery.of(context).size.height * 0.78,
      padding: EdgeInsets.only(bottom: bottomPad),
      child: Column(children: [
        // drag handle
        Padding(
          padding: const EdgeInsets.only(top: 10, bottom: 4),
          child: Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
            ),
          ),
        ),

        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: _redLight, borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.shield_outlined, color: _red, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(l.emergencyContacts,
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                Text(
                  _contacts.isEmpty
                      ? l.noContactsAdded
                      : l.contactCount(_contacts.length),
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                ),
              ]),
            ),
            TextButton.icon(
              onPressed: () => _showContactForm(),
              icon: const Icon(Icons.add, size: 18, color: _red),
              label: const Text('Add', style: TextStyle(color: _red, fontWeight: FontWeight.w600)),
              style: TextButton.styleFrom(
                backgroundColor: _redLight,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ]),
        ),

        const SizedBox(height: 12),
        Divider(height: 1, color: Colors.grey.shade100),

        // Contact list or empty state — fills all remaining height
        Expanded(
          child: _contacts.isEmpty
              ? Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(color: _redLight, shape: BoxShape.circle),
                      child: const Icon(Icons.people_outline, size: 36, color: _red),
                    ),
                    const SizedBox(height: 14),
                    Text(l.noContactsAdded,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text('Add someone who can be reached\nin case of emergency.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
                  ]),
                )
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  itemCount: _contacts.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final c = _contacts[i];
                    final name = c['name'] as String? ?? '';
                    final phone = c['phone'] as String? ?? '';
                    final rel = c['relationship'] as String? ?? '';
                    return Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.grey.shade100),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 8, offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        child: Row(children: [
                          // Initials avatar
                          Container(
                            width: 46, height: 46,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFFDC2626), Color(0xFFEF4444)],
                                begin: Alignment.topLeft, end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              _initials(name),
                              style: const TextStyle(
                                color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(name,
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                              const SizedBox(height: 3),
                              Wrap(
                                spacing: 6,
                                runSpacing: 4,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                children: [
                                  if (rel.isNotEmpty)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: _redLight,
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: _redMid),
                                      ),
                                      child: Text(rel,
                                          style: const TextStyle(fontSize: 11, color: _red, fontWeight: FontWeight.w500)),
                                    ),
                                  Row(mainAxisSize: MainAxisSize.min, children: [
                                    const Icon(Icons.phone_outlined, size: 13, color: Colors.grey),
                                    const SizedBox(width: 3),
                                    Text(phone,
                                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                                  ]),
                                ],
                              ),
                            ]),
                          ),
                          // Actions: call · edit · delete
                          Row(mainAxisSize: MainAxisSize.min, children: [
                            _actionBtn(
                              Icons.phone_rounded,
                              Colors.green.shade700,
                              Colors.green.shade50,
                              () => _call(phone),
                            ),
                            const SizedBox(width: 6),
                            _actionBtn(
                              Icons.edit_outlined,
                              const Color(0xFF0C4A6E),
                              const Color(0xFFE0F2FE),
                              () => _showContactForm(editIndex: i),
                            ),
                            const SizedBox(width: 6),
                            _actionBtn(
                              Icons.delete_outline_rounded,
                              _red,
                              Colors.red.shade50,
                              () => setState(() => _contacts.removeAt(i)),
                            ),
                          ]),
                        ]),
                      ),
                    );
                  },
                ),
        ),

        Divider(height: 1, color: Colors.grey.shade100),
        const SizedBox(height: 12),

        // Save button
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0C4A6E),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: _saving ? null : () async {
                setState(() => _saving = true);
                final ok = await widget.onSave(_contacts);
                if (!context.mounted) return;
                if (ok) {
                  Navigator.pop(context);
                } else {
                  setState(() => _saving = false);
                }
              },
              child: _saving
                  ? const SizedBox(height: 20, width: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(l.saveContacts,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            ),
          ),
        ),
      ]),
    );
  }
}

// ── Incident History Tab ─────────────────────────────────────────────────────

class _IncidentHistoryTab extends StatefulWidget {
  final String? userId;
  const _IncidentHistoryTab({this.userId});

  @override
  State<_IncidentHistoryTab> createState() => _IncidentHistoryTabState();
}

class _IncidentHistoryTabState extends State<_IncidentHistoryTab> {
  List<Map<String, dynamic>> _incidents = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    if (!mounted) return;
    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiService().get('/emergency/incidents/mine');
      final data = res.data as Map<String, dynamic>;
      if (mounted) setState(() => _incidents = List<Map<String, dynamic>>.from(data['incidents'] ?? []));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.error_outline, size: 48, color: Colors.grey),
        const SizedBox(height: 8),
        Text(l.failedToLoad, style: const TextStyle(color: Colors.grey)),
        TextButton.icon(onPressed: _fetch, icon: const Icon(Icons.refresh), label: Text(l.retry)),
      ]));
    }
    if (_incidents.isEmpty) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Text('📋', style: TextStyle(fontSize: 48)),
        const SizedBox(height: 8),
        Text(l.noIncidentHistory, style: const TextStyle(color: Colors.grey)),
        TextButton.icon(onPressed: _fetch, icon: const Icon(Icons.refresh), label: Text(l.refresh)),
      ]));
    }

    return RefreshIndicator(
      onRefresh: _fetch,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _incidents.length,
        itemBuilder: (_, i) => _IncidentTile(incident: _incidents[i]),
      ),
    );
  }
}

class _IncidentTile extends StatelessWidget {
  final Map<String, dynamic> incident;
  const _IncidentTile({required this.incident});

  static const _statusColors = {
    'new':         Color(0xFF0EA5E9),
    'in_progress': Color(0xFFF59E0B),
    'resolved':    Color(0xFF10B981),
  };
  static const _typeEmojis = {
    'medical': '🏥', 'fire': '🔥', 'crime': '🚔',
    'natural_disaster': '🌊', 'lost_person': '🆘',
  };

  @override
  Widget build(BuildContext context) {
    final status  = incident['status'] as String? ?? 'new';
    final type    = incident['type']   as String? ?? 'unknown';
    final created = incident['createdAt'] != null
        ? DateTime.tryParse(incident['createdAt'].toString())
        : null;
    final color = _statusColors[status] ?? Colors.grey;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: color.withValues(alpha: 0.3)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Text(_typeEmojis[type] ?? '⚠️', style: const TextStyle(fontSize: 28)),
        title: Text(type.replaceAll('_', ' ').toUpperCase(),
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        subtitle: Text(
          created != null ? DateFormat('MMM d, y · h:mm a').format(created.toLocal()) : '—',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
          child: Text(
            status.replaceAll('_', ' '),
            style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12),
          ),
        ),
      ),
    );
  }
}

// ── Shared helpers ───────────────────────────────────────────────────────────

String _resolveUrl(String url) =>
    url.startsWith('/') ? '${AppConstants.serverUrl}$url' : url;

Widget _buildAvatar(String? url, String name, {double radius = 20}) {
  if (url != null && url.isNotEmpty) {
    return CircleAvatar(
      radius: radius,
      backgroundColor: Colors.white24,
      child: ClipOval(
        child: CachedNetworkImage(
          imageUrl: _resolveUrl(url),
          width: radius * 2,
          height: radius * 2,
          fit: BoxFit.cover,
          placeholder: (_, __) => const CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
          errorWidget: (_, __, ___) => _initialsAvatar(name, radius),
        ),
      ),
    );
  }
  return _initialsAvatar(name, radius);
}

Widget _initialsAvatar(String name, double radius) {
  final initials = name.trim().isEmpty
      ? 'G'
      : name.trim().split(' ').map((w) => w[0].toUpperCase()).take(2).join();
  return CircleAvatar(
    radius: radius,
    backgroundColor: Colors.white24,
    child: Text(initials,
        style: TextStyle(fontSize: radius * 0.7, color: Colors.white, fontWeight: FontWeight.bold)),
  );
}

class _VerificationBadge extends StatelessWidget {
  final bool? verified;
  const _VerificationBadge({required this.verified});

  @override
  Widget build(BuildContext context) {
    if (verified == true) {
      return const Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.verified, size: 14, color: Colors.greenAccent),
        SizedBox(width: 4),
        Text('Verified photo', style: TextStyle(color: Colors.greenAccent, fontSize: 12)),
      ]);
    }
    if (verified == false) {
      return const Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.cancel, size: 14, color: Colors.redAccent),
        SizedBox(width: 4),
        Text('Photo not approved', style: TextStyle(color: Colors.redAccent, fontSize: 12)),
      ]);
    }
    return const Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.help_outline, size: 14, color: Colors.white54),
      SizedBox(width: 4),
      Text('Awaiting verification', style: TextStyle(color: Colors.white54, fontSize: 12)),
    ]);
  }
}
