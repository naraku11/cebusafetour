import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

// ── useMeta — Auto-binding hook for Dynamic Named Ranges ──────────────────
// Fetches /api/meta once and caches it forever (enum values don't change
// at runtime).  Every component that calls useMeta() shares the same cached
// response — there is only a single network request per session.
//
// Usage:
//   const { advisory, attraction, notification, user, incident } = useMeta();
//   advisory.severities  → ['critical', 'warning', 'advisory']
//   attraction.categories → ['beach', 'mountain', ...]
//
// Fallback values are returned while the first fetch is in-flight so
// components never need to handle undefined ranges.

const FALLBACK = {
  advisory: {
    severities: ['critical', 'warning', 'advisory'],
    sources:    ['pagasa', 'ndrrmc', 'lgu', 'cdrrmo', 'admin'],
    statuses:   ['active', 'resolved', 'archived'],
  },
  attraction: {
    categories:    ['beach', 'mountain', 'heritage', 'museum', 'park', 'waterfall', 'market', 'church', 'resort', 'other'],
    safetyStatuses:['safe', 'caution', 'restricted'],
    crowdLevels:   ['low', 'moderate', 'high'],
    statuses:      ['published', 'draft', 'archived'],
  },
  notification: {
    types:     ['safety_alert', 'advisory', 'trip_reminder', 'announcement', 'emergency'],
    priorities:['normal', 'high'],
    statuses:  ['pending', 'sent', 'failed'],
  },
  user: {
    roles:      ['tourist', 'admin_super', 'admin_content', 'admin_emergency'],
    staffRoles: ['admin_content', 'admin_emergency'],
    statuses:   ['active', 'suspended', 'banned', 'archived'],
    languages:  ['en', 'fil', 'zh', 'ko', 'ja'],
  },
  incident: {
    types:   ['medical', 'fire', 'crime', 'natural_disaster', 'lost_person'],
    statuses:['new', 'in_progress', 'resolved', 'archived'],
  },
};

export function useMeta() {
  const { data } = useQuery({
    queryKey: ['meta'],
    queryFn:  () => api.get('/meta').then(r => r.data),
    staleTime: Infinity,
    gcTime:    Infinity,
    retry: 1,
  });
  return data ?? FALLBACK;
}
