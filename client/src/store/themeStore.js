import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function applyClass(dark) {
  document.documentElement.classList.toggle('dark', dark);
}

/**
 * Persisted dark-mode store.
 *
 * Call `init()` once on app mount to restore the saved preference and apply
 * the `dark` class to <html>.  `toggle()` flips the mode and persists it.
 *
 * If the user has never set a preference, we respect the OS setting via
 * `prefers-color-scheme: dark`.
 */
export const useThemeStore = create(
  persist(
    (set, get) => ({
      dark: typeof window !== 'undefined'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false,

      init() {
        applyClass(get().dark);
      },

      toggle() {
        const next = !get().dark;
        set({ dark: next });
        applyClass(next);
      },
    }),
    { name: 'cebusafetour-theme', partialize: (s) => ({ dark: s.dark }) }
  )
);
