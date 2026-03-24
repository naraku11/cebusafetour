import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../services/auth_service.dart';

class ForgotPasswordScreen extends StatefulWidget {
  /// Pre-filled email (passed from login screen when user typed one).
  final String? initialEmail;
  const ForgotPasswordScreen({super.key, this.initialEmail});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey  = GlobalKey<FormState>();
  late final TextEditingController _emailCtrl;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _emailCtrl = TextEditingController(text: widget.initialEmail ?? '');
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final emailSent = await AuthService().forgotPassword(_emailCtrl.text.trim());
      if (mounted) {
        if (!emailSent) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Email delivery failed — check your inbox or try again.'),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 5),
            ),
          );
        }
        context.push('/auth/reset-password', extra: _emailCtrl.text.trim());
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
        title: Text(l.forgotPassword),
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SizedBox(height: 32),

            // Icon
            Container(
              alignment: Alignment.center,
              child: Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFFE0F2FE),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Icon(Icons.lock_reset_outlined, size: 40, color: Color(0xFF0EA5E9)),
              ),
            ),
            const SizedBox(height: 24),

            // Heading
            const Text(
              'Forgot Password?',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Enter the email address associated with your account.\nWe\'ll send a 6-digit reset code.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey, height: 1.5),
            ),
            const SizedBox(height: 40),

            // Email field
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _send(),
              decoration: InputDecoration(
                labelText: l.email,
                prefixIcon: const Icon(Icons.email_outlined),
              ),
              validator: (v) => (v?.contains('@') == true) ? null : l.invalidEmail,
            ),
            const SizedBox(height: 24),

            // Send button
            ElevatedButton(
              onPressed: _loading ? null : _send,
              child: _loading
                  ? const SizedBox(height: 20, width: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Send Reset Code'),
            ),
            const SizedBox(height: 20),

            // Back to login
            Center(
              child: TextButton(
                onPressed: () => context.pop(),
                child: Text(
                  'Back to Sign In',
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
