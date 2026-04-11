import { useState, useEffect } from 'react';

/**
 * Returns true when the browser tab is visible (Page Visibility API).
 * Switches to false as soon as the tab is hidden and back to true on return.
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handler = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return isVisible;
}
