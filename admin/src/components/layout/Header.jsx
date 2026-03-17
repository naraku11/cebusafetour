import { useAuthStore } from '../../store/authStore';
import { ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';

export default function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">CebuSafeTour Admin</h1>
        <p className="text-xs text-gray-500">Cebu, Philippines Tourism Safety Platform</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <UserCircleIcon className="w-6 h-6 text-gray-400" />
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('admin_', '')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Logout
        </button>
      </div>
    </header>
  );
}
