import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../l10n/app_localizations.dart';
import '../../models/review.dart';
import '../../providers/attractions_provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/safety_badge.dart';
import '../../widgets/emergency_fab.dart';

class AttractionDetail extends ConsumerWidget {
  final String attractionId;
  const AttractionDetail({super.key, required this.attractionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(attractionDetailProvider(attractionId));
    final l = AppLocalizations.of(context);

    return detail.when(
      loading: () => Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: Center(child: Text('Error: $e')),
      ),
      data: (a) => Scaffold(
        body: Stack(children: [
          CustomScrollView(slivers: [
            SliverAppBar(
              expandedHeight: 260,
              pinned: true,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.of(context).pop(),
              ),
              flexibleSpace: FlexibleSpaceBar(
                title: Text(a.name, style: const TextStyle(fontSize: 16)),
                background: a.photos.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: a.photos.first,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: double.infinity,
                      placeholder: (_, __) => Container(
                        color: const Color(0xFF0EA5E9),
                        child: const Center(child: CircularProgressIndicator(color: Colors.white70, strokeWidth: 2)),
                      ),
                      errorWidget: (_, __, ___) => Container(
                        color: const Color(0xFF0EA5E9),
                        child: const Icon(Icons.image_outlined, color: Colors.white54, size: 64),
                      ),
                    )
                  : Container(
                      color: const Color(0xFF0EA5E9),
                      child: const Icon(Icons.image_outlined, color: Colors.white54, size: 64),
                    ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.all(20),
              sliver: SliverList(delegate: SliverChildListDelegate([
                // Rating summary + safety badge
                Row(children: [
                  SafetyBadge(status: a.safetyStatus),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _showRatingSheet(context, ref, l),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.amber.shade200),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          '${a.averageRating.toStringAsFixed(1)} (${a.totalReviews})',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ]),
                    ),
                  ),
                ]),
                const SizedBox(height: 16),

                if (a.description != null) ...[
                  Text(a.description!, style: const TextStyle(color: Colors.black87, height: 1.5)),
                  const SizedBox(height: 16),
                ],

                _infoRow(Icons.location_on_outlined, a.address ?? '${a.latitude}, ${a.longitude}'),
                _infoRow(Icons.category_outlined, a.category[0].toUpperCase() + a.category.substring(1)),
                _infoRow(Icons.attach_money_outlined, a.entranceFee == 0 ? l.free : '₱${a.entranceFee.toStringAsFixed(0)}'),
                if (a.district != null) _infoRow(Icons.place_outlined, a.district!),

                const SizedBox(height: 24),

                // Crowd level
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(12)),
                  child: Row(children: [
                    const Icon(Icons.people_outlined, color: Color(0xFF0EA5E9)),
                    const SizedBox(width: 8),
                    Text('${l.crowdLevel}: ${a.crowdLevel[0].toUpperCase()}${a.crowdLevel.substring(1)}',
                      style: const TextStyle(fontWeight: FontWeight.w500)),
                  ]),
                ),

                const SizedBox(height: 24),
                Row(children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => launchUrl(Uri.parse('https://maps.google.com/?q=${a.latitude},${a.longitude}')),
                      icon: const Icon(Icons.directions_outlined),
                      label: Text(l.getDirections),
                    ),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(l.savedToList(a.name)),
                          backgroundColor: const Color(0xFF0EA5E9),
                          action: SnackBarAction(
                            label: l.ok,
                            textColor: Colors.white,
                            onPressed: () {},
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.bookmark_border_outlined),
                    label: Text(l.save),
                  ),
                ]),

                const SizedBox(height: 24),

                // Rate this place button
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _showRatingSheet(context, ref, l),
                    icon: const Icon(Icons.star_outline_rounded, color: Colors.amber),
                    label: Text(
                      l.rateThisPlace,
                      style: const TextStyle(color: Colors.amber),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.amber),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),

                const SizedBox(height: 24),

              ])),
            ),

            // Reviews section — lazy-loaded via SliverList.builder
            _ReviewsSliver(attractionId: attractionId),

            const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
          ]),
          const Positioned(bottom: 24, right: 24, child: EmergencyFab()),
        ]),
      ),
    );
  }

  void _showRatingSheet(BuildContext context, WidgetRef ref, AppLocalizations l) {
    final auth = ref.read(authProvider);
    if (auth.user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l.loginRequired)),
      );
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _RatingSheet(attractionId: attractionId),
    );
  }

  Widget _infoRow(IconData icon, String text) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(children: [
      Icon(icon, size: 18, color: Colors.grey),
      const SizedBox(width: 8),
      Expanded(child: Text(text, style: const TextStyle(color: Colors.black87))),
    ]),
  );
}

// ── Rating Bottom Sheet ────────────────────────────────────────────────────────

class _RatingSheet extends ConsumerStatefulWidget {
  final String attractionId;
  const _RatingSheet({required this.attractionId});

  @override
  ConsumerState<_RatingSheet> createState() => _RatingSheetState();
}

class _RatingSheetState extends ConsumerState<_RatingSheet> {
  int _selected = 0;
  final _commentCtrl = TextEditingController();

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final notifier = ref.watch(reviewNotifierProvider);
    final isLoading = notifier is AsyncLoading;

    return Padding(
      padding: EdgeInsets.only(
        left: 24, right: 24, top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 40, height: 4, decoration: BoxDecoration(
          color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 20),
        Text(l.rateThisPlace, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 20),

        // Star row
        Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) {
          final star = i + 1;
          return GestureDetector(
            onTap: () => setState(() => _selected = star),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Icon(
                star <= _selected ? Icons.star_rounded : Icons.star_outline_rounded,
                color: Colors.amber,
                size: 40,
              ),
            ),
          );
        })),

        const SizedBox(height: 8),
        Text(
          _selected == 0 ? l.tapToRate : _ratingLabel(l, _selected),
          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
        ),

        const SizedBox(height: 16),
        TextField(
          controller: _commentCtrl,
          maxLines: 3,
          maxLength: 300,
          decoration: InputDecoration(
            hintText: l.writeAReview,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            contentPadding: const EdgeInsets.all(12),
          ),
        ),

        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: isLoading || _selected == 0
                ? null
                : () async {
                    await ref.read(reviewNotifierProvider.notifier)
                        .submit(widget.attractionId, _selected, _commentCtrl.text);
                    if (!mounted) return;
                    final state = ref.read(reviewNotifierProvider);
                    if (state is AsyncError) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Error: ${state.error}')));
                    } else {
                      ref.invalidate(reviewsProvider(widget.attractionId));
                      ref.invalidate(attractionDetailProvider(widget.attractionId));
                      ref.invalidate(attractionsProvider);
                      // Capture messenger BEFORE pop — sheet context is invalid after pop
                      final messenger = ScaffoldMessenger.of(context);
                      Navigator.of(context).pop();
                      messenger.showSnackBar(
                        SnackBar(
                          content: Text(l.reviewSubmitted),
                          backgroundColor: const Color(0xFF0EA5E9),
                        ),
                      );
                    }
                  },
            child: isLoading
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(l.submitReview),
          ),
        ),
      ]),
    );
  }

  String _ratingLabel(AppLocalizations l, int stars) {
    switch (stars) {
      case 1: return l.ratingTerrible;
      case 2: return l.ratingBad;
      case 3: return l.ratingOkay;
      case 4: return l.ratingGood;
      case 5: return l.ratingExcellent;
      default: return '';
    }
  }
}

// ── Reviews List Section ───────────────────────────────────────────────────────

class _ReviewsSliver extends ConsumerWidget {
  final String attractionId;
  const _ReviewsSliver({required this.attractionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviewsAsync = ref.watch(reviewsProvider(attractionId));
    final l = AppLocalizations.of(context);

    return reviewsAsync.when(
      loading: () => const SliverToBoxAdapter(
        child: Center(child: Padding(
          padding: EdgeInsets.all(16),
          child: CircularProgressIndicator(),
        )),
      ),
      error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
      data: (reviews) {
        if (reviews.isEmpty) {
          return SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(top: 8, bottom: 8),
              child: Center(
                child: Text(l.noReviewsYet, style: TextStyle(color: Colors.grey.shade500)),
              ),
            ),
          );
        }
        return SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          sliver: SliverList.builder(
            itemCount: reviews.length + 1, // +1 for the header
            itemBuilder: (ctx, i) {
              if (i == 0) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(l.reviews, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                );
              }
              return _ReviewTile(review: reviews[i - 1], attractionId: attractionId);
            },
          ),
        );
      },
    );
  }
}

class _ReviewTile extends ConsumerStatefulWidget {
  final Review review;
  final String attractionId;
  const _ReviewTile({required this.review, required this.attractionId});

  @override
  ConsumerState<_ReviewTile> createState() => _ReviewTileState();
}

class _ReviewTileState extends ConsumerState<_ReviewTile> {
  bool _deleting = false;

  @override
  Widget build(BuildContext context) {
    final currentUser = ref.watch(authProvider).user;
    final isOwn = currentUser?.id == widget.review.userId;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          CircleAvatar(
            radius: 16,
            backgroundImage: widget.review.user?.profilePicture != null
                ? NetworkImage(widget.review.user!.profilePicture!)
                : null,
            child: widget.review.user?.profilePicture == null
                ? Text(widget.review.user?.name.substring(0, 1).toUpperCase() ?? '?',
                    style: const TextStyle(fontSize: 12))
                : null,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(widget.review.user?.name ?? 'Anonymous',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              Row(children: [
                ...List.generate(5, (i) => Icon(
                  i < widget.review.rating ? Icons.star_rounded : Icons.star_outline_rounded,
                  color: Colors.amber, size: 14,
                )),
                const SizedBox(width: 6),
                Text(
                  _formatDate(widget.review.createdAt),
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                ),
              ]),
            ]),
          ),
          if (isOwn)
            _deleting
                ? const SizedBox(
                    width: 18, height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red),
                  )
                : IconButton(
                    onPressed: _confirmDelete,
                    icon: Icon(Icons.delete_outline, size: 18, color: Colors.red.shade300),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                  ),
        ]),
        if (widget.review.comment != null && widget.review.comment!.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(widget.review.comment!, style: const TextStyle(fontSize: 13, color: Colors.black87)),
        ],
      ]),
    );
  }

  void _confirmDelete() {
    final l = AppLocalizations.of(context);
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: Text(l.deleteReview),
        content: Text(l.deleteReviewConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: Text(l.cancel),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(dialogCtx);
              if (!mounted) return;
              setState(() => _deleting = true);
              try {
                await ref.read(reviewNotifierProvider.notifier)
                    .deleteOwn(widget.attractionId);
                if (!mounted) return;
                ref.invalidate(reviewsProvider(widget.attractionId));
                ref.invalidate(attractionDetailProvider(widget.attractionId));
                ref.invalidate(attractionsProvider);
              } catch (e) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed to delete: $e')),
                );
              } finally {
                if (mounted) setState(() => _deleting = false);
              }
            },
            child: Text(l.delete, style: const TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 30) return '${diff.inDays}d ago';
    if (diff.inDays < 365) return '${(diff.inDays / 30).floor()}mo ago';
    return '${(diff.inDays / 365).floor()}y ago';
  }
}
