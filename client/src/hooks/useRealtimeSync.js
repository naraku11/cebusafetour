import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';

/**
 * Connects to the Socket.IO server while the admin is logged in.
 * Listens for DB-write events and invalidates the relevant React Query caches.
 * Uses debounced batch invalidation to coalesce rapid-fire socket events.
 */
export function useRealtimeSync() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const pendingKeys = useRef(new Set());
  const timer = useRef(null);

  const scheduleInvalidation = useCallback((...keys) => {
    for (const k of keys) pendingKeys.current.add(k);
    if (timer.current) return; // already scheduled
    timer.current = setTimeout(() => {
      for (const key of pendingKeys.current) {
        qc.invalidateQueries({ queryKey: [key] });
      }
      pendingKeys.current.clear();
      timer.current = null;
    }, 200); // 200ms debounce window
  }, [qc]);

  useEffect(() => {
    if (!token) return;

    const s = connectSocket(token);

    s.on('incident:new',       () => scheduleInvalidation('incidents', 'reports-summary'));
    s.on('incident:updated',   () => scheduleInvalidation('incidents'));
    s.on('incident:archived',  () => scheduleInvalidation('incidents', 'reports-summary'));
    s.on('advisory:new',       () => scheduleInvalidation('advisories', 'reports-summary'));
    s.on('advisory:updated',   () => scheduleInvalidation('advisories', 'reports-summary'));
    s.on('notification:new',   () => scheduleInvalidation('notifications'));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      disconnectSocket();
    };
  }, [token, scheduleInvalidation]);
}
