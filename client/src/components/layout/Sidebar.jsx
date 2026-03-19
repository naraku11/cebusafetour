import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  HomeIcon, MapPinIcon, ExclamationTriangleIcon,
  ShieldExclamationIcon, UsersIcon, BellIcon,
  DocumentChartBarIcon, StarIcon,
} from '@heroicons/react/24/outline';

// Each nav item declares which roles can see it
const ALL_NAV = [
  { to: '/dashboard',     icon: HomeIcon,                label: 'Dashboard',       roles: ['admin_super', 'admin_content', 'admin_emergency'] },
  { to: '/attractions',   icon: MapPinIcon,              label: 'Attractions',      roles: ['admin_super', 'admin_content'] },
  { to: '/reviews',       icon: StarIcon,                label: 'Reviews',          roles: ['admin_super', 'admin_content'] },
  { to: '/advisories',    icon: ExclamationTriangleIcon, label: 'Advisories',       roles: ['admin_super', 'admin_content'] },
  { to: '/emergency',     icon: ShieldExclamationIcon,   label: 'Emergency Center', roles: ['admin_super', 'admin_emergency'] },
  { to: '/users',         icon: UsersIcon,               label: 'Users',            roles: ['admin_super'] },
  { to: '/notifications', icon: BellIcon,                label: 'Notifications',    roles: ['admin_super', 'admin_content', 'admin_emergency'] },
  { to: '/reports',       icon: DocumentChartBarIcon,    label: 'Reports',          roles: ['admin_super', 'admin_content', 'admin_emergency'] },
];

const ROLE_META = {
  admin_super:     { label: 'Super Admin',       dot: 'bg-violet-400' },
  admin_content:   { label: 'Content Manager',   dot: 'bg-blue-400'   },
  admin_emergency: { label: 'Emergency Officer', dot: 'bg-red-400'    },
};

export default function Sidebar() {
  const { user } = useAuthStore();
  const role = user?.role ?? '';
  const meta = ROLE_META[role] ?? { label: role, dot: 'bg-gray-400' };
  const navItems = ALL_NAV.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏖</span>
          <div>
            <p className="font-bold text-white leading-tight">CebuSafeTour</p>
            <p className="text-gray-400 text-xs">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Logged-in role badge */}
      <div className="px-4 py-2.5 border-b border-gray-700 bg-gray-800/60">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
          <span className="text-xs font-medium text-gray-300">{meta.label}</span>
        </div>
        {user?.name && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{user.name}</p>
        )}
      </div>

      {/* Role-filtered navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-700">
        <p className="text-gray-500 text-xs">v1.0.0 — CebuSafeTour</p>
      </div>
    </aside>
  );
}
