import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useThemeStore } from '../../store/themeStore';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const initTheme = useThemeStore((s) => s.init);

  // Apply saved dark/light preference on first render
  useEffect(() => { initTheme(); }, [initTheme]);

  return (
    <div className="flex h-[100dvh] bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-200">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header is sticky by virtue of the fixed-height flex layout */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 animate-in"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
