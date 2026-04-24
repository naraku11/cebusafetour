import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../utils/app_toast.dart';

class OtpScreen extends ConsumerStatefulWidget {
  final String email;
  // emailSent is false when SMTP failed at registration — we tell the user to resend
  final bool emailSent;
  const OtpScreen({super.key, required this.email, this.emailSent = true});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _otpCtrl = TextEditingController();
  bool _loading  = false;
  bool _resending = false;
  int  _countdown = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    // OTP was already sent during registration — start the cooldown immediately
    // so the user can't spam resend before 60 s have passed.
    if (widget.emailSent) _startCountdown();
  }

  @override
  void dispose() {
    _otpCtrl.dispose();
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

  Future<void> _verify() async {
    if (_otpCtrl.text.trim().length != 6) return;
    setState(() => _loading = true);
    final ok = await ref.read(authProvider.notifier).verifyOtp(widget.email, _otpCtrl.text.trim());
    if (!mounted) return;
    setState(() => _loading = false);
    if (ok) {
      context.go('/home');
    } else {
      final err = ref.read(authProvider).error ?? 'Verification failed. Please try again.';
      AppToast.error(context, err);
    }
  }

  Future<void> _resend() async {
    setState(() => _resending = true);
    try {
      await AuthService().resendOtp(widget.email);
      if (mounted) {
        _startCountdown();
        AppToast.success(context, 'A new verification code has been sent to your email.');
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.verifyEmail)),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const SizedBox(height: 32),
          const Icon(Icons.mark_email_read_outlined, size: 64, color: Color(0xFF0EA5E9)),
          const SizedBox(height: 16),
          Text(l.checkEmail,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),

          // Show different subtitle if email delivery failed at registration
          if (!widget.emailSent)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Row(children: [
                Icon(Icons.warning_amber_rounded, color: Colors.orange.shade700, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Email delivery failed. Tap "Resend Code" below to get your verification code.',
                    style: TextStyle(fontSize: 13, color: Colors.orange.shade800),
                  ),
                ),
              ]),
            )
          else
            Text(l.codeSentTo(widget.email),
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey)),

          const SizedBox(height: 40),
          TextFormField(
            controller: _otpCtrl,
            keyboardType: TextInputType.number,
            maxLength: 6,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 28, letterSpacing: 12, fontWeight: FontWeight.bold),
            decoration: const InputDecoration(hintText: '000000', counterText: ''),
            onChanged: (v) { if (v.trim().length == 6) _verify(); },
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loading ? null : _verify,
            child: _loading
                ? const SizedBox(height: 20, width: 20,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text(l.verifyAndContinue),
          ),
          const SizedBox(height: 12),
          Center(
            child: _countdown > 0
                ? Text(l.resendCountdown(_countdown), style: const TextStyle(color: Colors.grey))
                : TextButton(
                    onPressed: _resending ? null : _resend,
                    child: _resending
                        ? const SizedBox(height: 16, width: 16,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : Text(l.resendOtp),
                  ),
          ),
        ]),
      ),
    );
  }
}
