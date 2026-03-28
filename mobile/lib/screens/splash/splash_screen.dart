import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../utils/theme.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    // Minimum branding display so splash doesn't flash away instantly
    Future.delayed(const Duration(milliseconds: 800), () => _tryNavigate());
  }

  void _tryNavigate() {
    if (_navigated || !mounted) return;
    final state = ref.read(authProvider);
    // Wait until auth finishes loading before navigating
    if (state.isLoading) return;
    _navigated = true;
    if (state.token != null) {
      context.go('/home');
    } else {
      context.go('/auth/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    // Watch auth state so we navigate as soon as loading finishes
    final auth = ref.watch(authProvider);
    if (!auth.isLoading) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _tryNavigate());
    }

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0C4A6E), AppTheme.primaryColor, AppTheme.tealColor],
          ),
        ),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('🏖', style: TextStyle(fontSize: 72)),
              SizedBox(height: 16),
              Text(
                'CebuSafeTour',
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              SizedBox(height: 8),
              Text(
                'Your Safe Guide to Cebu',
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
              SizedBox(height: 48),
              CircularProgressIndicator(color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}
