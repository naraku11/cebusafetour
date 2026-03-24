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
