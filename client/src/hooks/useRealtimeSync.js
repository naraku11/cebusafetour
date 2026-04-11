import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';

// SSE URL — same origin as the API, at /api/events
const _apiBase = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL          // already ends with /api
  : window.location.origin.replace(':5173', ':5000') + '/api';
const SSE_URL = `${_apiBase}/events`;

// Map each server event to the React Query cache keys it should invalidate
const EVENT_KEYS = {
  'incident:new':      ['incidents', 'reports-summary'],
  'incident:updated':  ['incidents'],
  'incident:archived': ['incidents', 'reports-summary'],
  'advisory:new':      ['advisories', 'reports-summary'],
  'advisory:updated':  ['advisories', 'reports-summary'],
  'notification:new':  ['notifications'],
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
    // EventSource reconnects automatically on error — no special handler needed
  }, [token, scheduleInvalidation]);

  const closeSSE = useCallback(() => {
    sseRef.current?.close();
    sseRef.current = null;
  }, []);

  useEffect(() => {
    if (!token) return;

    const s = connectSocket(token);

    // Register event listeners
    for (const [event, keys] of Object.entries(EVENT_KEYS)) {
      s.on(event, () => scheduleInvalidation(...keys));
    }

    // WebSocket connected — SSE no longer needed
    s.on('connect', () => {
      wsFailCount.current = 0;
      closeSSE();
    });

    // WebSocket failed — open SSE after 3 consecutive failures
    s.on('connect_error', () => {
      wsFailCount.current += 1;
      if (wsFailCount.current >= 3) openSSE();
    });

    // Tab became visible — reconnect socket if it dropped while hidden
    const handleVisibility = () => {
      if (!document.hidden && !s.connected) s.connect();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      disconnectSocket();
      closeSSE();
    };
  }, [token, scheduleInvalidation, openSSE, closeSSE]);
}
