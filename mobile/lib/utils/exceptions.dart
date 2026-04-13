/// Thrown when the server responds with 403 ACCOUNT_SUSPENDED.
/// Used to distinguish suspension from generic network / auth errors.
class AccountSuspendedException implements Exception {
  final String message;
  const AccountSuspendedException(
      [this.message =
          'Your account has been suspended or banned. Please contact support.']);

  @override
  String toString() => message;
}

/// Thrown when the server responds with 401 Unauthorized on /auth/me,
/// meaning the stored token is explicitly invalid or expired.
/// Triggers a clean logout — distinct from a network/timeout error which
/// should keep the user logged in with cached data.
class TokenExpiredException implements Exception {
  const TokenExpiredException();
  @override
  String toString() => 'Session expired. Please sign in again.';
}
