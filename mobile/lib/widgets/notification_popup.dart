import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/app_notification.dart';

const _kMapsKey = 'AIzaSyDQ2JLuyUdoWVJ11Nfvn7bLe1OBvGh2M9M';

// ── Notification Type Styling ───────────────────────────────────────────────

class _NotifStyle {
  final Color color;
  final Color bgColor;
  final Color borderColor;
  final IconData icon;
  final String label;

  const _NotifStyle({
    required this.color,
    required this.bgColor,
    required this.borderColor,
    required this.icon,
    required this.label,
  });
}

_NotifStyle _styleFor(AppNotification notif) {
  switch (notif.type) {
    case 'emergency':
      return const _NotifStyle(
        color: Color(0xFFDC2626),
        bgColor: Color(0xFFFEF2F2),
        borderColor: Color(0xFFFECACA),
        icon: Icons.emergency_outlined,
        label: 'EMERGENCY',
      );
    case 'safety_alert':
      return const _NotifStyle(
        color: Color(0xFFEA580C),
        bgColor: Color(0xFFFFF7ED),
        borderColor: Color(0xFFFED7AA),
        icon: Icons.warning_amber_rounded,
        label: 'SAFETY ALERT',
      );
    case 'advisory':
      return const _NotifStyle(
        color: Color(0xFFD97706),
        bgColor: Color(0xFFFFFBEB),
        borderColor: Color(0xFFFDE68A),
        icon: Icons.info_outlined,
        label: 'ADVISORY',
      );
    case 'trip_reminder':
      return const _NotifStyle(
        color: Color(0xFF0D9488),
        bgColor: Color(0xFFF0FDFA),
        borderColor: Color(0xFF99F6E4),
        icon: Icons.map_outlined,
        label: 'TRIP REMINDER',
      );
    default: // announcement
      return const _NotifStyle(
        color: Color(0xFF0284C7),
        bgColor: Color(0xFFF0F9FF),
        borderColor: Color(0xFFBAE6FD),
        icon: Icons.campaign_outlined,
        label: 'ANNOUNCEMENT',
      );
  }
}

// ── Emergency Full-Screen Overlay ───────────────────────────────────────────

class EmergencyOverlay extends StatefulWidget {
  final AppNotification notification;
  final VoidCallback onDismiss;
  final VoidCallback onViewDetails;

  const EmergencyOverlay({
    super.key,
    required this.notification,
    required this.onDismiss,
    required this.onViewDetails,
  });

  @override
  State<EmergencyOverlay> createState() => _EmergencyOverlayState();
}

class _EmergencyOverlayState extends State<EmergencyOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnim;
  late Animation<double> _fadeAnim;
  bool _pulsing = true;

  @override
  void initState() {
    super.initState();
    HapticFeedback.heavyImpact();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _scaleAnim = CurvedAnimation(parent: _controller, curve: Curves.elasticOut);
    _fadeAnim = CurvedAnimation(parent: _controller, curve: Curves.easeIn);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnim,
      child: Material(
        color: Colors.black.withValues(alpha: 0.75),
        child: SafeArea(
          child: Center(
            child: ScaleTransition(
              scale: _scaleAnim,
              child: Container(
                margin: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFDC2626).withValues(alpha: 0.3),
                      blurRadius: 40,
                      spreadRadius: 4,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Red header
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 28),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFFDC2626), Color(0xFFB91C1C)],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                      ),
                      child: Column(
                        children: [
                          // Pulsing icon
                          TweenAnimationBuilder<double>(
                            tween: Tween(begin: 1.0, end: _pulsing ? 1.15 : 1.0),
                            duration: const Duration(milliseconds: 800),
                            curve: Curves.easeInOut,
                            onEnd: () {
                              if (mounted) setState(() => _pulsing = !_pulsing);
                            },
                            builder: (_, scale, child) => Transform.scale(scale: scale, child: child),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.emergency, color: Colors.white, size: 48),
                            ),
                          ),
                          const SizedBox(height: 14),
                          const Text(
                            'EMERGENCY ALERT',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 2,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Content
                    Padding(
                      padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
                      child: Column(
                        children: [
                          Text(
                            widget.notification.title,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1F2937),
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            widget.notification.body,
                            style: const TextStyle(
                              fontSize: 15,
                              color: Color(0xFF4B5563),
                              height: 1.5,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 6,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _formatTime(widget.notification.receivedAt),
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),

                    // Actions
                    Padding(
                      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                      child: Column(
                        children: [
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: widget.onViewDetails,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFDC2626),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              icon: const Icon(Icons.visibility_outlined, size: 18),
                              label: const Text('View Details',
                                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                            ),
                          ),
                          const SizedBox(height: 10),
                          TextButton(
                            onPressed: widget.onDismiss,
                            child: const Text('Dismiss',
                                style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w500)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Slide-Down Banner Popup (safety_alert, advisory, high priority) ─────────

class NotificationBanner extends StatefulWidget {
  final AppNotification notification;
  final VoidCallback onDismiss;
  final VoidCallback onTap;
  final String? actionLabel;
  final VoidCallback? onAction;

  const NotificationBanner({
    super.key,
    required this.notification,
    required this.onDismiss,
    required this.onTap,
    this.actionLabel,
    this.onAction,
  });

  @override
  State<NotificationBanner> createState() => _NotificationBannerState();
}

class _NotificationBannerState extends State<NotificationBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slideAnim;
  Timer? _autoClose;

  @override
  void initState() {
    super.initState();
    HapticFeedback.mediumImpact();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -1.5),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _controller.forward();

    // Auto-dismiss: advisories stay longer since they require a conscious tap
    final duration = widget.notification.isEmergency || widget.notification.isCritical
        ? const Duration(seconds: 10)
        : widget.notification.type == 'advisory'
            ? const Duration(seconds: 8)
            : const Duration(seconds: 5);
    _autoClose = Timer(duration, _dismiss);
  }

  void _dismiss() {
    _autoClose?.cancel();
    if (!mounted) return;
    _controller.reverse().then((_) {
      if (mounted) widget.onDismiss();
    });
  }

  @override
  void dispose() {
    _autoClose?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final style = _styleFor(widget.notification);
    final topPad = MediaQuery.of(context).padding.top;

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SlideTransition(
        position: _slideAnim,
        child: GestureDetector(
          onTap: () {
            _autoClose?.cancel();
            widget.onTap();
          },
          onVerticalDragEnd: (details) {
            if (details.primaryVelocity != null && details.primaryVelocity! < -100) {
              _dismiss();
            }
          },
          child: Material(
            color: Colors.transparent,
            child: Container(
              padding: EdgeInsets.fromLTRB(16, topPad + 12, 16, 14),
              decoration: BoxDecoration(
                color: style.bgColor,
                border: Border(bottom: BorderSide(color: style.borderColor, width: 2)),
                boxShadow: [
                  BoxShadow(
                    color: style.color.withValues(alpha: 0.15),
                    blurRadius: 20,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Icon
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: style.color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(style.icon, color: style.color, size: 24),
                  ),
                  const SizedBox(width: 12),
                  // Content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Type label
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: style.color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            style.label,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: style.color,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.notification.title,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: style.color,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.notification.body,
                          style: TextStyle(
                            fontSize: 13,
                            color: style.color.withValues(alpha: 0.8),
                            height: 1.3,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        // Advisory extra details: location, map, source, actions
                        if (widget.notification.isAdvisory)
                          _AdvisoryDetails(notification: widget.notification),

                        if (widget.actionLabel != null && widget.onAction != null) ...[
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              GestureDetector(
                                onTap: () {
                                  _autoClose?.cancel();
                                  widget.onAction!();
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: style.color,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    widget.actionLabel!,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Text(
                                'Swipe up to dismiss',
                                style: TextStyle(fontSize: 10, color: style.color.withValues(alpha: 0.5)),
                              ),
                            ],
                          ),
                        ] else
                          Text(
                            'Tap to view  •  Swipe up to dismiss',
                            style: TextStyle(fontSize: 10, color: style.color.withValues(alpha: 0.5)),
                          ),
                      ],
                    ),
                  ),
                  // Close button
                  GestureDetector(
                    onTap: _dismiss,
                    child: Padding(
                      padding: const EdgeInsets.only(left: 4),
                      child: Icon(Icons.close, size: 18, color: style.color.withValues(alpha: 0.5)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Popup Manager (shows overlays via Overlay) ──────────────────────────────

class NotificationPopupManager {
  static OverlayEntry? _currentEntry;

  static void show(
    BuildContext context,
    AppNotification notification, {
    required void Function(String route) navigator,
  }) {
    dismiss(); // remove any existing popup

    if (notification.isEmergency) {
      _showEmergencyOverlay(context, notification, navigator);
    } else {
      _showBanner(context, notification, navigator);
    }
  }

  static void dismiss() {
    _currentEntry?.remove();
    _currentEntry = null;
  }

  // Returns the deep-link route for a given notification type.
  static String _routeFor(AppNotification n) =>
      n.type == 'advisory' ? '/advisories' : '/notifications';

  static void _showEmergencyOverlay(
    BuildContext context,
    AppNotification notification,
    void Function(String route) navigator,
  ) {
    late final OverlayEntry entry;
    void dismissThis() {
      entry.remove();
      if (_currentEntry == entry) _currentEntry = null;
    }

    entry = OverlayEntry(
      builder: (_) => EmergencyOverlay(
        notification: notification,
        onDismiss: dismissThis,
        onViewDetails: () {
          dismissThis();
          navigator('/notifications');
        },
      ),
    );
    _currentEntry = entry;
    Overlay.of(context).insert(entry);
  }

  static void _showBanner(
    BuildContext context,
    AppNotification notification,
    void Function(String route) navigator,
  ) {
    final route = _routeFor(notification);
    final isAdvisory = notification.type == 'advisory';

    late final OverlayEntry entry;
    void dismissThis() {
      entry.remove();
      if (_currentEntry == entry) _currentEntry = null;
    }

    entry = OverlayEntry(
      builder: (_) => NotificationBanner(
        notification: notification,
        onDismiss: dismissThis,
        onTap: () {
          dismissThis();
          navigator(route);
        },
        actionLabel: isAdvisory ? 'View Advisory' : null,
        onAction: isAdvisory
            ? () {
                dismissThis();
                navigator('/advisories');
              }
            : null,
      ),
    );
    _currentEntry = entry;
    Overlay.of(context).insert(entry);
  }
}

// ── Advisory Detail Section ─────────────────────────────────────────────────

class _AdvisoryDetails extends StatelessWidget {
  final AppNotification notification;
  const _AdvisoryDetails({required this.notification});

  static const _sourceLabels = {
    'pagasa':  'PAGASA',
    'ndrrmc':  'NDRRMC',
    'lgu':     'LGU',
    'cdrrmo':  'CDRRMO',
    'admin':   'Admin',
  };

  @override
  Widget build(BuildContext context) {
    final n      = notification;
    final style  = _styleFor(n);
    final hasMap = n.lat != null && n.lng != null;
    final mapUrl = hasMap
        ? 'https://maps.googleapis.com/maps/api/staticmap'
          '?center=${n.lat},${n.lng}&zoom=13&size=640x320'
          '&markers=color:red%7C${n.lat},${n.lng}'
          '&key=$_kMapsKey'
        : null;

    final sourceLabel = _sourceLabels[n.source?.toLowerCase()] ?? n.source;
    final actions     = n.recommendedActions;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Divider(height: 16, thickness: 1, color: style.borderColor),

        // Location row
        if (n.locationName != null && n.locationName!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              children: [
                Icon(Icons.location_on_outlined, size: 14, color: style.color),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    n.locationName!,
                    style: TextStyle(fontSize: 12, color: style.color, fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),

        // Static map thumbnail
        if (mapUrl != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: CachedNetworkImage(
                imageUrl: mapUrl,
                height: 100,
                width: double.infinity,
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(
                  height: 100,
                  color: style.color.withValues(alpha: 0.08),
                  child: Center(
                    child: Icon(Icons.map_outlined, color: style.color.withValues(alpha: 0.4), size: 28),
                  ),
                ),
                errorWidget: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
          ),

        // Source
        if (sourceLabel != null && sourceLabel.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              children: [
                Icon(Icons.source_outlined, size: 13, color: style.color.withValues(alpha: 0.7)),
                const SizedBox(width: 4),
                Text(
                  'Source: $sourceLabel',
                  style: TextStyle(fontSize: 11, color: style.color.withValues(alpha: 0.8)),
                ),
              ],
            ),
          ),

        // Recommended actions (first line only)
        if (actions != null && actions.isNotEmpty)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.bolt_outlined, size: 13, color: style.color.withValues(alpha: 0.7)),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  actions,
                  style: TextStyle(fontSize: 11, color: style.color.withValues(alpha: 0.8)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
      ],
    );
  }
}

// ── Helper ──────────────────────────────────────────────────────────────────

String _formatTime(DateTime dt) {
  final h = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
  final ampm = dt.hour >= 12 ? 'PM' : 'AM';
  final m = dt.minute.toString().padLeft(2, '0');
  return '$h:$m $ampm';
}
