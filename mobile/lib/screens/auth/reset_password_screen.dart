import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../services/auth_service.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String email;
  const ResetPasswordScreen({super.key, required this.email});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey      = GlobalKey<FormState>();
  final _otpCtrl      = TextEditingController();
  final _passCtrl     = TextEditingController();
  final _confirmCtrl  = TextEditingController();

  bool _loading    = false;
  bool _resending  = false;
  bool _obscure    = true;
  bool _obscure2   = true;
  int  _countdown  = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    // OTP was already sent by the previous screen — start the cooldown
    _startCountdown();
  }

  @override
  void dispose() {
    _otpCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    setState(() => _countdown = 60);
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      setState(() => _countdown--);
      if (_countdown <= 0) t.cancel();
    });
  }

  Future<void> _resend() async {
    setState(() => _resending = true);
    try {
      await AuthService().forgotPassword(widget.email);
      if (mounted) {
        _startCountdown();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('A new reset code has been sent to your email.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        final msg = e.toString().replaceFirst('Exception: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: Colors.red.shade700),
        );
      }
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await AuthService().resetPassword(
        widget.email,
        _otpCtrl.text.trim(),
        _passCtrl.text,
      );
      if (mounted) {
        // Capture messenger BEFORE context.go() disposes this widget
        final messenger = ScaffoldMessenger.of(context);
        context.go('/auth/login');
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Password reset! Please sign in with your new password.'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        final msg = e.toString().replaceFirst('Exception: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: Colors.red.shade700),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reset Password'),
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SizedBox(height: 24),

            // Icon
            Container(
              alignment: Alignment.center,
              child: Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Icon(Icons.shield_outlined, size: 40, color: Color(0xFF22C55E)),
              ),
            ),
            const SizedBox(height: 20),

            const Text(
              'Create New Password',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),

            // Email chip
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F9FF),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFBAE6FD)),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.email_outlined, size: 14, color: Color(0xFF0284C7)),
                  const SizedBox(width: 6),
                  Text(
                    widget.email,
                    style: const TextStyle(
                      color: Color(0xFF0284C7), fontSize: 13, fontWeight: FontWeight.w500,
                    ),
                  ),
                ]),
              ),
            ),
            const SizedBox(height: 32),

            // ── OTP field ────────────────────────────────────────────────────
            Text('Verification Code', style: TextStyle(
              fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade700,
            )),
            const SizedBox(height: 6),
            TextFormField(
              controller: _otpCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 28, letterSpacing: 12, fontWeight: FontWeight.bold),
              decoration: const InputDecoration(hintText: '000000', counterText: ''),
              validator: (v) => (v?.trim().length == 6) ? null : 'Enter the 6-digit code',
            ),
            const SizedBox(height: 8),

            // Resend countdown
            Center(
              child: _countdown > 0
                  ? Text(
                      'Resend code in ${_countdown}s',
                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                    )
                  : TextButton(
                      onPressed: _resending ? null : _resend,
                      child: _resending
                          ? const SizedBox(height: 16, width: 16,
                              child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Resend Code'),
                    ),
            ),
            const SizedBox(height: 20),

            // ── New password ─────────────────────────────────────────────────
            TextFormField(
              controller: _passCtrl,
              obscureText: _obscure,
              decoration: InputDecoration(
                labelText: 'New Password',
                prefixIcon: const Icon(Icons.lock_outlined),
                suffixIcon: IconButton(
                  icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
              validator: (v) => (v != null && v.length >= 8)
                  ? null
                  : l.minChars,
            ),
            const SizedBox(height: 16),

            // ── Confirm password ─────────────────────────────────────────────
            TextFormField(
              controller: _confirmCtrl,
              obscureText: _obscure2,
              decoration: InputDecoration(
                labelText: 'Confirm New Password',
                prefixIcon: const Icon(Icons.lock_outlined),
                suffixIcon: IconButton(
                  icon: Icon(_obscure2 ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _obscure2 = !_obscure2),
                ),
              ),
              validator: (v) => v == _passCtrl.text ? null : 'Passwords do not match',
            ),
            const SizedBox(height: 28),

            // ── Submit button ─────────────────────────────────────────────────
            ElevatedButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(height: 20, width: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Reset Password'),
            ),
          ]),
        ),
      ),
    );
  }
}
