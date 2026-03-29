import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ArrowRightOnRectangleIcon, UserCircleIcon, Bars3Icon } from '@heroicons/react/24/outline';

const ROLE_BADGE = {
  admin_super:     { label: 'Super Admin',       className: 'bg-violet-100 text-violet-700' },
  admin_content:   { label: 'Content Manager',   className: 'bg-blue-100   text-blue-700'   },
  admin_emergency: { label: 'Emergency Officer', className: 'bg-red-100    text-red-700'    },
};

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuthStore();
  const badge = ROLE_BADGE[user?.role] ?? { label: user?.role ?? '', className: 'bg-gray-100 text-gray-600' };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">CebuSafeTour Admin</h1>
          <p className="text-xs text-gray-500 hidden sm:block">Cebu, Philippines Tourism Safety Platform</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <Link to="/profile" className="hidden sm:flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <UserCircleIcon className="w-7 h-7 text-gray-400" />
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        </Link>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
