import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { ArrowRightOnRectangleIcon, UserCircleIcon, ArrowPathIcon, Bars3Icon } from '@heroicons/react/24/outline';

const ROLE_BADGE = {
  admin_super:     { label: 'Super Admin',       className: 'bg-violet-100 text-violet-700' },
  admin_content:   { label: 'Content Manager',   className: 'bg-blue-100   text-blue-700'   },
  admin_emergency: { label: 'Emergency Officer', className: 'bg-red-100    text-red-700'    },
};

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const badge = ROLE_BADGE[user?.role] ?? { label: user?.role ?? '', className: 'bg-gray-100 text-gray-600' };

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

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
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh all data"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <div className="hidden sm:flex items-center gap-2.5">
          <UserCircleIcon className="w-7 h-7 text-gray-400" />
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        </div>

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
