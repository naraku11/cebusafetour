import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/language_provider.dart';
import '../../utils/constants.dart';
import '../../utils/theme.dart';
import '../../widgets/language_picker_sheet.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    final success = await ref.read(authProvider.notifier).login(
      _emailCtrl.text.trim(),
      _passCtrl.text,
    );
    if (mounted && success) context.go('/home');
  }

  void _goVerifyEmail() {
    context.push('/auth/otp', extra: {
      'email': _emailCtrl.text.trim(),
      'emailSent': false,
    });
  }

  Future<void> _pickLanguage() async {
    final l = AppLocalizations.of(context);
    final current = ref.read(languageProvider);
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => LanguagePickerSheet(
        title: l.selectLanguage,
        searchHint: l.searchLanguage,
        currentCode: current,
      ),
    );
    if (picked != null) {
      await ref.read(languageProvider.notifier).setLanguage(picked);
    }
  }

  void _goForgotPassword() {
    context.push('/auth/forgot-password', extra: _emailCtrl.text.trim().isNotEmpty
        ? _emailCtrl.text.trim()
        : null);
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final currentLang = ref.watch(languageProvider);
    final l = AppLocalizations.of(context);

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const SizedBox(height: 32),

              // ── Branding ──────────────────────────────────────────────────
              const Text('🏖', textAlign: TextAlign.center, style: TextStyle(fontSize: 64)),
              const SizedBox(height: 16),
              const Text('CebuSafeTour',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
              Text(l.welcomeBack,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.grey)),
              const SizedBox(height: 40),

              // ── Form ──────────────────────────────────────────────────────
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: l.email, prefixIcon: const Icon(Icons.email_outlined),
                ),
                validator: (v) => v!.contains('@') ? null : l.invalidEmail,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passCtrl,
                obscureText: _obscure,
                decoration: InputDecoration(
                  labelText: l.password,
                  prefixIcon: const Icon(Icons.lock_outlined),
                  suffixIcon: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
                validator: (v) => v!.length >= 6 ? null : 'Password too short',
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: _goForgotPassword,
                  child: Text(l.forgotPassword),
                ),
              ),

              // ── Error banners ─────────────────────────────────────────────
              if (auth.isSuspended && auth.error != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    border: Border.all(color: Colors.orange.shade300),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Icon(Icons.block_rounded, color: Colors.orange.shade700, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Account Restricted',
                            style: TextStyle(
                                color: Colors.orange.shade800,
                                fontWeight: FontWeight.bold,
                                fontSize: 14)),
                        const SizedBox(height: 3),
                        Text(auth.error!,
                            style: TextStyle(color: Colors.orange.shade800, fontSize: 13)),
                      ]),
                    ),
                  ]),
                )
              else if (auth.error != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: auth.error!.contains('expired')
                        ? Colors.amber.shade50
                        : Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: auth.error!.contains('expired')
                          ? Colors.amber.shade300
                          : Colors.red.shade100,
                    ),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Icon(
                        auth.error!.contains('expired')
                            ? Icons.access_time_outlined
                            : Icons.error_outline,
                        size: 16,
                        color: auth.error!.contains('expired')
                            ? Colors.amber.shade700
                            : Colors.red.shade700,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          auth.error!,
                          style: TextStyle(
                            color: auth.error!.contains('expired')
                                ? Colors.amber.shade800
                                : Colors.red.shade700,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ]),
                    if (auth.error!.toLowerCase().contains('verify')) ...[
                      const SizedBox(height: 8),
                      GestureDetector(
                        onTap: _emailCtrl.text.trim().isNotEmpty ? _goVerifyEmail : null,
                        child: Text('Verify your email →',
                            style: TextStyle(
                                color: Colors.red.shade800,
                                fontWeight: FontWeight.bold,
                                fontSize: 13)),
                      ),
                    ],
                  ]),
                ),

              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: auth.isLoading ? null : _login,
                child: auth.isLoading
                    ? const SizedBox(height: 20, width: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(l.signIn),
              ),

              const SizedBox(height: 24),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text('${l.dontHaveAccount} '),
                GestureDetector(
                  onTap: () => context.push('/auth/register'),
                  child: Text(l.signUp,
                      style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold)),
                ),
              ]),

              const SizedBox(height: 32),

              // ── Language button ────────────────────────────────────────────
              Center(
                child: OutlinedButton.icon(
                  onPressed: _pickLanguage,
                  icon: Text(languageFlag(currentLang),
                      style: const TextStyle(fontSize: 18)),
                  label: Text(
                    AppConstants.languages.firstWhere(
                      (lang) => lang['code'] == currentLang,
                      orElse: () => {'label': currentLang.toUpperCase()},
                    )['label']!,
                    style: const TextStyle(fontSize: 13),
                  ),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20)),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 10),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ]),
          ),
        ),
      ),
    );
  }
}

// ── Full searchable language picker sheet ─────────────────────────────────────

