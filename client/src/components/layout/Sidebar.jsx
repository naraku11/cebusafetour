import { NavLink } from 'react-router-dom';
import {
  HomeIcon, MapPinIcon, ExclamationTriangleIcon,
  ShieldExclamationIcon, UsersIcon, BellIcon,
  DocumentChartBarIcon, StarIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
  { to: '/attractions', icon: MapPinIcon, label: 'Attractions' },
  { to: '/reviews', icon: StarIcon, label: 'Reviews' },
  { to: '/advisories', icon: ExclamationTriangleIcon, label: 'Advisories' },
  { to: '/emergency', icon: ShieldExclamationIcon, label: 'Emergency Center' },
  { to: '/users', icon: UsersIcon, label: 'Users' },
  { to: '/notifications', icon: BellIcon, label: 'Notifications' },
  { to: '/reports', icon: DocumentChartBarIcon, label: 'Reports' },
];

export default function Sidebar() {
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

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
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
