import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../services/auth_service.dart';
import '../../utils/app_toast.dart';
import '../../utils/nationalities.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _nationalityDisplay = TextEditingController();
  String? _nationality;
  bool _loading = false;
  bool _agreed = false;
  String? _emailError; // inline duplicate-email feedback

  @override
  void dispose() {
    for (final c in [_nameCtrl, _emailCtrl, _passCtrl, _phoneCtrl, _nationalityDisplay]) c.dispose();
    super.dispose();
  }

  Future<void> _pickNationality() async {
    final l = AppLocalizations.of(context);
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _NationalityPicker(
        title: l.selectNationality,
        searchHint: l.searchNationality,
      ),
    );
    if (picked != null) {
      setState(() => _nationality = picked);
      _nationalityDisplay.text = picked;
    }
  }

  Future<void> _register() async {
    setState(() => _emailError = null);
    if (!_formKey.currentState!.validate() || !_agreed) return;
    setState(() => _loading = true);
    try {
      final result = await AuthService().register(
        name: _nameCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
        nationality: _nationality,
        contactNumber: _phoneCtrl.text.trim(),
      );
      if (mounted) context.push('/auth/otp', extra: {
        'email':     _emailCtrl.text.trim(),
        'emailSent': result['emailSent'] as bool? ?? true,
      });
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().replaceFirst('Exception: ', '');
      final isDuplicate = msg.toLowerCase().contains('already registered') ||
          msg.toLowerCase().contains('already exist');
      if (isDuplicate) {
        setState(() => _emailError = msg);
        _formKey.currentState!.validate(); // re-run to show inline error
      } else {
        AppToast.error(context, msg);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.createAccount)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            TextFormField(
              controller: _nameCtrl,
              decoration: InputDecoration(labelText: l.fullName, prefixIcon: const Icon(Icons.person_outlined)),
              validator: (v) => v!.trim().isEmpty ? l.fieldRequired : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(labelText: l.email, prefixIcon: const Icon(Icons.email_outlined)),
              onChanged: (_) { if (_emailError != null) setState(() => _emailError = null); },
              validator: (v) {
                if (_emailError != null) return _emailError;
                return v!.contains('@') ? null : l.invalidEmail;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _passCtrl,
              obscureText: true,
              decoration: InputDecoration(labelText: l.passwordHint, prefixIcon: const Icon(Icons.lock_outlined)),
              validator: (v) => v!.length >= 8 ? null : l.minChars,
            ),
            const SizedBox(height: 16),

            // Nationality picker field
            TextFormField(
              controller: _nationalityDisplay,
              readOnly: true,
              onTap: _pickNationality,
              decoration: InputDecoration(
                labelText: l.nationality,
                hintText: l.selectNationality,
                prefixIcon: const Icon(Icons.flag_outlined),
                suffixIcon: const Icon(Icons.arrow_drop_down),
              ),
            ),

            const SizedBox(height: 16),
            TextFormField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: l.contactNumber, prefixIcon: const Icon(Icons.phone_outlined)),
            ),
            const SizedBox(height: 20),
            Row(children: [
              Checkbox(value: _agreed, onChanged: (v) => setState(() => _agreed = v!)),
              Expanded(child: GestureDetector(
                onTap: () => setState(() => _agreed = !_agreed),
                child: Text(l.agreeTerms, style: const TextStyle(fontSize: 13)),
              )),
            ]),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: (_loading || !_agreed) ? null : _register,
              child: _loading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(l.createAccount),
            ),
            const SizedBox(height: 16),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text('${l.alreadyHaveAccount} '),
              GestureDetector(
                onTap: () => context.go('/auth/login'),
                child: Text(l.signIn, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0EA5E9))),
              ),
            ]),
          ]),
        ),
      ),
    );
  }
}

// ── Nationality Picker Bottom Sheet ─────────────────────────────────────────

class _NationalityPicker extends StatefulWidget {
  final String title;
  final String searchHint;
  const _NationalityPicker({required this.title, required this.searchHint});

  @override
  State<_NationalityPicker> createState() => _NationalityPickerState();
}

class _NationalityPickerState extends State<_NationalityPicker> {
  final _searchCtrl = TextEditingController();
  List<String> _filtered = kWorldNationalities;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearch(String q) {
    final lower = q.toLowerCase();
    setState(() {
      _filtered = q.isEmpty
          ? kWorldNationalities
          : kWorldNationalities.where((n) => n.toLowerCase().contains(lower)).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.of(context).size.height * 0.85;
    return Container(
      height: height,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(children: [
        // Handle bar
        Container(
          margin: const EdgeInsets.only(top: 10, bottom: 6),
          width: 40, height: 4,
          decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(children: [
            Expanded(
              child: Text(widget.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => Navigator.pop(context),
            ),
          ]),
        ),
        // Search field
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: TextField(
            controller: _searchCtrl,
            autofocus: true,
            onChanged: _onSearch,
            decoration: InputDecoration(
              hintText: widget.searchHint,
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _searchCtrl.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () { _searchCtrl.clear(); _onSearch(''); },
                    )
                  : null,
              filled: true,
              fillColor: Colors.grey.shade100,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            ),
          ),
        ),
        const Divider(height: 1),
        // List
        Expanded(
          child: _filtered.isEmpty
              ? Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Text('🔍', style: TextStyle(fontSize: 36)),
                    const SizedBox(height: 8),
                    Text('No results for "${_searchCtrl.text}"', style: const TextStyle(color: Colors.grey)),
                  ]),
                )
              : ListView.builder(
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  itemCount: _filtered.length,
                  itemBuilder: (_, i) {
                    final nat = _filtered[i];
                    return ListTile(
                      leading: const Icon(Icons.flag_outlined, size: 20, color: Color(0xFF0EA5E9)),
                      title: Text(nat),
                      onTap: () => Navigator.pop(context, nat),
                      dense: true,
                    );
                  },
                ),
        ),
      ]),
    );
  }
}
