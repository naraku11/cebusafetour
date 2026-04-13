import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  HomeIcon, MapPinIcon, ExclamationTriangleIcon,
  ShieldExclamationIcon, UsersIcon, BellIcon,
  DocumentChartBarIcon, StarIcon, XMarkIcon,
  QuestionMarkCircleIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline';

const ALL  = ['admin_super', 'admin_content', 'admin_emergency'];
const SUPR = ['admin_super'];
const SC   = ['admin_super', 'admin_content'];
const SE   = ['admin_super', 'admin_emergency'];

// Hierarchical nav: groups with an optional section label + filtered items
const NAV_GROUPS = [
  {
    label: null, // no header — top-level overview
    items: [
      { to: '/dashboard', icon: HomeIcon, label: 'Dashboard', roles: ALL },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/attractions', icon: MapPinIcon,              label: 'Attractions', roles: SC },
      { to: '/reviews',     icon: StarIcon,                label: 'Reviews',     roles: SC },
      { to: '/advisories',  icon: ExclamationTriangleIcon, label: 'Advisories',  roles: SC },
    ],
  },
  {
    label: 'Emergency',
    items: [
      { to: '/emergency', icon: ShieldExclamationIcon, label: 'Emergency Center', roles: SE },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/users', icon: UsersIcon, label: 'Users', roles: SUPR },
    ],
  },
  {
    label: 'Communication',
    items: [
      { to: '/notifications', icon: BellIcon,                label: 'Notifications', roles: ALL },
      { to: '/reports',       icon: DocumentChartBarIcon,    label: 'Reports',       roles: ALL },
    ],
  },
  {
    label: 'Support',
    items: [
      { to: '/help', icon: QuestionMarkCircleIcon, label: 'Help & FAQ', roles: ALL },
    ],
  },
];

const ROLE_META = {
  admin_super:     { label: 'Super Admin',       dot: 'bg-violet-400' },
  admin_content:   { label: 'Content Manager',   dot: 'bg-blue-400'   },
  admin_emergency: { label: 'Emergency Officer', dot: 'bg-red-400'    },
};

export default function Sidebar({ open, onClose }) {
  const { user } = useAuthStore();
  const role = user?.role ?? '';
  const meta = ROLE_META[role] ?? { label: role, dot: 'bg-gray-400' };

  // Track which labeled sections are collapsed; all start expanded
  const [collapsed, setCollapsed] = useState({});
  const toggle = (label) => setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  // Filter each group's items by role; drop groups that end up empty
  const visibleGroups = NAV_GROUPS
    .map(group => ({ ...group, items: group.items.filter(item => item.roles.includes(role)) }))
    .filter(group => group.items.length > 0);

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      className={`
        fixed inset-y-0 left-0 z-50 w-64
        bg-gray-900 dark:bg-gray-950
        text-white flex flex-col shrink-0
        border-r border-gray-800 dark:border-gray-800
        transform transition-transform duration-200 ease-out
        md:relative md:translate-x-0
        ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}
    >
      {/* ── Logo + mobile close ──────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" aria-hidden="true">🏖</span>
          <div>
            <p className="font-bold text-white leading-tight text-[15px]">CebuSafeTour</p>
            <p className="text-gray-500 text-xs">Admin Portal</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close navigation menu"
          className="md:hidden p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors duration-150"
        >
          <XMarkIcon className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* ── Logged-in role badge ─────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-b border-gray-800 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} aria-hidden="true" />
          <span className="text-xs font-semibold text-gray-300">{meta.label}</span>
        </div>
        {user?.name && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{user.name}</p>
        )}
      </div>

      {/* ── Hierarchical navigation ──────────────────────────────────────── */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto" aria-label="Site sections">
        {visibleGroups.map((group, gi) => {
          const isCollapsed = group.label ? (collapsed[group.label] ?? false) : false;

          return (
            <div key={group.label ?? '__overview'} className={gi > 0 ? 'mt-5' : ''}>

              {/* Collapsible section header */}
              {group.label && (
                <button
                  onClick={() => toggle(group.label)}
                  aria-expanded={!isCollapsed}
                  className="w-full flex items-center justify-between px-3 mb-1.5 group/hdr"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 group-hover/hdr:text-gray-400 transition-colors select-none">
                    {group.label}
                  </span>
                  <ChevronDownIcon
                    className={`w-3 h-3 text-gray-600 group-hover/hdr:text-gray-400 transition-all duration-200 ${
                      isCollapsed ? '-rotate-90' : 'rotate-0'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              )}

              {/* Items — collapse via max-height transition */}
              <div
                className="overflow-hidden transition-all duration-200 ease-in-out"
                style={{ maxHeight: isCollapsed ? '0px' : '500px' }}
              >
                <div className="space-y-0.5">
                  {group.items.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={onClose}
                      aria-label={label}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                          isActive
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={`w-5 h-5 shrink-0 transition-transform duration-150 ${
                              isActive ? '' : 'group-hover:scale-110'
                            }`}
                            aria-hidden="true"
                          />
                          <span>{label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>

            </div>
          );
        })}
      </nav>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-t border-gray-800">
        <p className="text-gray-600 text-xs">v1.0.0 · CebuSafeTour</p>
      </div>
    </aside>
  );
}
