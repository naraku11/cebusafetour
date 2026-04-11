import { useRef, useCallback } from 'react';

/**
 * Adaptive polling interval for React Query v5.
 *
 * Behaviour
 * ─────────
 * • Pauses entirely when the browser tab is hidden (Page Visibility API).
 * • Starts at `base` ms on mount.
 * • Each time a refetch returns the *same* data, the interval is multiplied by
 *   `factor` up to `max` ms (exponential back-off).
 * • As soon as new data arrives the interval resets to `base`.
 *
 * Usage
 * ─────
 *   const { refetchInterval, observe } = useAdaptivePolling({ base: 15_000, max: 60_000 });
 *
 *   const { data } = useQuery({
 *     queryKey: ['incidents'],
 *     queryFn: fetchIncidents,
 *     refetchInterval,                // React Query v5 accepts a function
 *   });
 *
 *   // Feed fresh data back so the hook can track changes:
 *   useEffect(() => { if (data) observe(data); }, [data, observe]);
 *
 * @param {object} opts
 * @param {number} opts.base    Initial interval in ms (default 15 000)
 * @param {number} opts.max     Maximum interval in ms (default 120 000)
 * @param {number} opts.factor  Backoff multiplier per unchanged poll (default 1.5)
 */
export function useAdaptivePolling({ base = 15_000, max = 120_000, factor = 1.5 } = {}) {
  const intervalRef  = useRef(base);
  const snapshotRef  = useRef(null);

  /**
   * Call this with the latest query data so the hook can detect changes.
   * Passed as a `useEffect` dependency — stable reference via useCallback.
   */
  const observe = useCallback((data) => {
    const snap = JSON.stringify(data);
    if (snap === snapshotRef.current) {
      // Data unchanged — slow down (cap at max)
      intervalRef.current = Math.min(intervalRef.current * factor, max);
    } else {
      // New data — reset to base cadence
      intervalRef.current = base;
      snapshotRef.current = snap;
    }
  }, [base, max, factor]);

  /**
   * Pass directly as `refetchInterval` in useQuery.
   * React Query v5 calls this before scheduling the next refetch.
   * Returning `false` cancels the interval entirely.
   */
  const refetchInterval = useCallback(() => {
    // Pause while the tab is hidden
    if (document.hidden) return false;
    return intervalRef.current;
  }, []);

  return { refetchInterval, observe };
}
