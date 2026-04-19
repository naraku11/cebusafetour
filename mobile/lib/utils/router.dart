import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../screens/splash/splash_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/otp_screen.dart';
import '../screens/auth/forgot_password_screen.dart';
import '../screens/auth/reset_password_screen.dart';
import '../screens/home/home_dashboard.dart';
import '../screens/explore/explore_screen.dart';
import '../screens/explore/attraction_detail.dart';
import '../screens/emergency/emergency_screen.dart';
import '../screens/advisories/advisories_screen.dart';
import '../screens/trip_planner/trip_planner_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/notifications/notifications_screen.dart';
import '../screens/help/help_faq_screen.dart';

// Persistent key shared across all GoRouter instances so the navigator context
// is always reachable for overlays (e.g. notification popups).
final navigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    navigatorKey: navigatorKey,
    initialLocation: '/splash',
    redirect: (context, state) {
      final isLoggedIn  = authState.token != null;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');
      final isSplash    = state.matchedLocation == '/splash';
      // Advisories are public — visible even to non-logged-in users so they
      // can see safety information after tapping a push notification.
      final isPublic    = state.matchedLocation == '/advisories';

      if (isSplash || isPublic) return null;
      if (!isLoggedIn && !isAuthRoute) return '/auth/login';
      if (isLoggedIn && isAuthRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (ctx, _) => const SplashScreen()),
      GoRoute(path: '/auth/login', builder: (ctx, _) => const LoginScreen()),
      GoRoute(path: '/auth/register', builder: (ctx, _) => const RegisterScreen()),
      GoRoute(
        path: '/auth/otp',
        builder: (ctx, state) {
          // extra can be a plain String (legacy / forgot-password flow)
          // or a Map { 'email': String, 'emailSent': bool } (registration flow)
          final extra = state.extra;
          if (extra is Map) {
            return OtpScreen(
              email:     extra['email'] as String,
              emailSent: extra['emailSent'] as bool? ?? true,
            );
          }
          return OtpScreen(email: extra as String);
        },
      ),
      GoRoute(
        path: '/auth/forgot-password',
        builder: (ctx, state) => ForgotPasswordScreen(
          initialEmail: state.extra as String?,
        ),
      ),
      GoRoute(
        path: '/auth/reset-password',
        builder: (ctx, state) => ResetPasswordScreen(
          email: state.extra as String,
        ),
      ),
      GoRoute(path: '/home', builder: (ctx, _) => const HomeDashboard()),
      GoRoute(path: '/explore', builder: (ctx, _) => const ExploreScreen()),
      GoRoute(
        path: '/explore/:id',
        builder: (ctx, state) => AttractionDetail(attractionId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/emergency', builder: (ctx, _) => const EmergencyScreen()),
      GoRoute(path: '/advisories', builder: (ctx, _) => const AdvisoriesScreen()),
      GoRoute(path: '/trip-planner', builder: (ctx, _) => const TripPlannerScreen()),
      GoRoute(path: '/profile', builder: (ctx, _) => const ProfileScreen()),
      GoRoute(path: '/notifications', builder: (ctx, _) => const NotificationsScreen()),
      GoRoute(path: '/help', builder: (ctx, _) => const HelpFaqScreen()),
    ],
  );
});
