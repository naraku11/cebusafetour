import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';

// SSE URL — same origin as the API, at /api/events
const _apiBase = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL          // already ends with /api
  : window.location.origin.replace(':5173', ':5000') + '/api';
const SSE_URL = `${_apiBase}/events`;

/**
 * Map every server-emitted event to the React Query cache keys it invalidates.
 *
 * Events are emitted by socketService.js (WebSocket) AND relayed to SSE
 * clients via the lazy-required emitSSE() in socketService.js.
 */
const EVENT_KEYS = {
  // ── Incidents ─────────────────────────────────────────────────────────
  // Also invalidates dashboard analytical queries so charts update in real-time
  // without waiting for the polling interval.
  'incident:new':      ['incidents', 'reports-summary', 'reports-incidents', 'reports-trends'],
  'incident:updated':  ['incidents', 'reports-incidents'],
  'incident:archived': ['incidents', 'incidents-archived', 'reports-summary', 'reports-incidents'],
  'incident:deleted':  ['incidents', 'incidents-archived', 'reports-summary', 'reports-incidents'],

  // ── Advisories ────────────────────────────────────────────────────────
  'advisory:new':          ['advisories', 'reports-summary', 'reports-trends'],
  'advisory:updated':      ['advisories', 'reports-summary', 'reports-trends'],
  'advisory:deleted':      ['advisories', 'reports-summary', 'reports-trends'],
  'advisory:acknowledged': ['advisories'],

  // ── Notifications ─────────────────────────────────────────────────────
  'notification:new':     ['notifications'],
  'notification:deleted': ['notifications'],

  // ── Attractions ───────────────────────────────────────────────────────
  // Trend charts include attraction safety ratings, so invalidate reports-trends too.
  'attraction:new':     ['attractions', 'reports-attractions', 'reports-trends'],
  'attraction:updated': ['attractions', 'reports-attractions'],
  'attraction:deleted': ['attractions', 'reports-attractions', 'reports-trends'],

  // ── Reviews ───────────────────────────────────────────────────────────
  'review:new':     ['reviews', 'attractions'],
  'review:deleted': ['reviews', 'attractions'],

  // ── Users / Staff ─────────────────────────────────────────────────────
  'user:updated':        ['users', 'reports-summary'],
  'user:deleted':        ['users', 'reports-summary'],
  'user:profile-updated':['users'],
  'user:verified':       ['users'],
  'staff:created':       ['users'],
  'staff:updated':       ['users'],
  'staff:deleted':       ['users'],
};

/**
 * Connects to the Socket.IO server while the admin is logged in.
 * If Socket.IO fails to connect 3 times, opens an SSE (EventSource) stream
 * as a read-only fallback — both channels call the same cache-invalidation logic.
 *
 * Cleanup:
 * • Disconnects socket and closes EventSource on unmount / token change.
 * • Clears debounce timer to avoid state updates after unmount.
 * • Re-connects socket on tab-visible if the connection dropped while hidden.
 */
export function useRealtimeSync() {
  const token       = useAuthStore((s) => s.token);
  const qc          = useQueryClient();
  const pendingKeys = useRef(new Set());
  const debounceRef = useRef(null);
  const sseRef      = useRef(null);
  const wsFailCount = useRef(0);

  // Debounced batch invalidation — coalesces rapid-fire events into one flush
  const scheduleInvalidation = useCallback((...keys) => {
    for (const k of keys) pendingKeys.current.add(k);
    if (debounceRef.current) return;
    debounceRef.current = setTimeout(() => {
      for (const key of pendingKeys.current) {
        qc.invalidateQueries({ queryKey: [key] });
      }
      pendingKeys.current.clear();
      debounceRef.current = null;
    }, 200);
  }, [qc]);

  // Open SSE fallback stream (used when WebSocket repeatedly fails)
  const openSSE = useCallback(() => {
    if (sseRef.current) return;
    const es = new EventSource(`${SSE_URL}?token=${encodeURIComponent(token)}`);
    sseRef.current = es;
    for (const [event, keys] of Object.entries(EVENT_KEYS)) {
      es.addEventListener(event, () => scheduleInvalidation(...keys));
    }
    // EventSource reconnects automatically on error
  }, [token, scheduleInvalidation]);

  const closeSSE = useCallback(() => {
    sseRef.current?.close();
    sseRef.current = null;
  }, []);

  useEffect(() => {
    if (!token) return;

    const s = connectSocket(token);

    // Store named handler references so they can be removed on cleanup,
    // preventing listener accumulation across reconnect cycles.
    const handlers = new Map();
    for (const [event, keys] of Object.entries(EVENT_KEYS)) {
      const handler = () => scheduleInvalidation(...keys);
      handlers.set(event, handler);
      s.on(event, handler);
    }

    const onConnect = () => { wsFailCount.current = 0; closeSSE(); };
    const onConnectError = () => {
      wsFailCount.current += 1;
      if (wsFailCount.current >= 3) openSSE();
    };

    s.on('connect', onConnect);
    s.on('connect_error', onConnectError);

    // Tab became visible — reconnect socket if it dropped while hidden
    const handleVisibility = () => {
      if (!document.hidden && !s.connected) s.connect();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      // Remove all named handlers before disconnecting to prevent accumulation
      for (const [event, handler] of handlers) {
        s.off(event, handler);
      }
      s.off('connect', onConnect);
      s.off('connect_error', onConnectError);
      disconnectSocket();
      closeSSE();
    };
  }, [token, scheduleInvalidation, openSSE, closeSSE]);
}
