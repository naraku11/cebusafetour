import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';

/**
 * Connects to the Socket.IO server while the admin is logged in.
 * Listens for DB-write events and invalidates the relevant React Query caches.
 */
export function useRealtimeSync() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) return;

    const s = connectSocket(token);

    s.on('incident:new',       () => qc.invalidateQueries({ queryKey: ['incidents'] }));
    s.on('incident:updated',   () => qc.invalidateQueries({ queryKey: ['incidents'] }));
    s.on('advisory:new',       () => qc.invalidateQueries({ queryKey: ['advisories'] }));
    s.on('advisory:updated',   () => qc.invalidateQueries({ queryKey: ['advisories'] }));
    s.on('notification:new',   () => qc.invalidateQueries({ queryKey: ['notifications'] }));

    // Dashboard stats refresh on any incident/advisory change
    s.on('incident:new',     () => qc.invalidateQueries({ queryKey: ['reports-summary'] }));
    s.on('advisory:new',     () => qc.invalidateQueries({ queryKey: ['reports-summary'] }));
    s.on('advisory:updated', () => qc.invalidateQueries({ queryKey: ['reports-summary'] }));

    return () => {
      disconnectSocket();
    };
  }, [token]);
}
