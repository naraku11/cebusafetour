import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

const ROLE_BADGE = {
  admin_super:     { label: 'Super Admin',       className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  admin_content:   { label: 'Content Manager',   className: 'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300'   },
  admin_emergency: { label: 'Emergency Officer', className: 'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300'    },
};

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuthStore();
  const { dark, toggle } = useThemeStore();
  const badge = ROLE_BADGE[user?.role] ?? { label: user?.role ?? '', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 gap-3 transition-colors duration-200 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger — opens sidebar */}
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-haspopup="true"
          className="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-150"
        >
          <Bars3Icon className="w-6 h-6" aria-hidden="true" />
        </button>

        {/* Skip-to-content link (keyboard / screen-reader users) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
            CebuSafeTour Admin
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            Cebu, Philippines Tourism Safety Platform
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        {/* Profile link — avatar + name + role badge */}
        <Link
          to="/profile"
          aria-label="My profile"
          className="hidden sm:flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150 group"
        >
          <UserCircleIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors duration-150 shrink-0" aria-hidden="true" />
          <div className="text-left leading-tight">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px]">
              {user?.name}
            </p>
            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        </Link>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Light mode' : 'Dark mode'}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150 active:scale-90"
        >
          {dark
            ? <SunIcon  className="w-5 h-5" aria-hidden="true" />
            : <MoonIcon className="w-5 h-5" aria-hidden="true" />}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          aria-label="Log out"
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-150"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline font-medium">Logout</span>
        </button>
      </div>
    </header>
  );
}
