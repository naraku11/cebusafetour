import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../models/attraction.dart';
import 'safety_badge.dart';

class AttractionCard extends StatelessWidget {
  final Attraction attraction;
  const AttractionCard({super.key, required this.attraction});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Image
        if (attraction.photos.isNotEmpty)
          CachedNetworkImage(
            imageUrl: attraction.photos.first,
            height: 160,
            width: double.infinity,
            fit: BoxFit.cover,
            placeholder: (_, __) => _placeholder(),
            errorWidget: (_, __, ___) => _placeholder(),
          )
        else
          _placeholder(),

        Padding(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(attraction.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15), maxLines: 1, overflow: TextOverflow.ellipsis)),
              Text(
                attraction.totalReviews > 0
                    ? '⭐ ${attraction.averageRating.toStringAsFixed(1)}'
                    : 'No ratings',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ]),
            const SizedBox(height: 4),
            if (attraction.district != null)
              Text(attraction.district!, style: const TextStyle(color: Colors.grey, fontSize: 12)),
            const SizedBox(height: 8),
            Row(children: [
              SafetyBadge(status: attraction.safetyStatus, small: true),
              const SizedBox(width: 8),
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(20)),
                  child: Text(
                    attraction.category[0].toUpperCase() + attraction.category.substring(1),
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              const Spacer(),
              Text(attraction.entranceFee == 0 ? 'Free' : '₱${attraction.entranceFee.toStringAsFixed(0)}',
                style: const TextStyle(fontWeight: FontWeight.w500, color: Color(0xFF0EA5E9))),
            ]),
          ]),
        ),
      ]),
    );
  }

  Widget _placeholder() => Container(
    height: 160,
    color: const Color(0xFF0EA5E9).withValues(alpha: 0.1),
    child: const Center(child: Icon(Icons.image_outlined, size: 48, color: Color(0xFF0EA5E9))),
  );
}
