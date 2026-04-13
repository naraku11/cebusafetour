import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { SparklesIcon, CheckBadgeIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { UserGroupIcon, ShieldCheckIcon, PlusIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

// ── shared helpers ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  active:    'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  banned:    'bg-red-100 text-red-700',
  archived:  'bg-gray-100 text-gray-500',
};

const ROLE_STYLES = {
  admin_content:   { label: 'Content Manager',   cls: 'bg-blue-100 text-blue-700' },
  admin_emergency: { label: 'Emergency Officer', cls: 'bg-red-100 text-red-700'  },
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
];

const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

const getAvatarColor = (name = '') => {
  const code = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
};

function Avatar({ user, size = 'sm' }) {
  const [imgErr, setImgErr] = useState(false);
  const sizeClass = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-8 h-8 text-xs';
  const inner = user?.profilePicture && !imgErr
    ? <img src={user.profilePicture} alt={user.name} className={`${sizeClass} rounded-full object-cover`} onError={() => setImgErr(true)} />
    : <div className={`${sizeClass} ${getAvatarColor(user?.name)} rounded-full flex items-center justify-center text-white font-semibold`}>{getInitials(user?.name)}</div>;
  return (
    <div className="relative shrink-0 inline-flex">
      {inner}
      {size === 'lg' && user?.profilePicture && !imgErr && (
        user.profilePictureVerified === true
          ? <CheckBadgeIcon className="w-5 h-5 text-green-500 bg-white rounded-full absolute bottom-0 right-0" />
          : user.profilePictureVerified === false
            ? <XCircleIcon className="w-5 h-5 text-red-400 bg-white rounded-full absolute bottom-0 right-0" />
            : null
      )}
    </div>
  );
}

// ── Confirm dialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ action, isPending, onConfirm, onCancel }) {
  if (!action) return null;
  const { type, name, status } = action;

  let title, body, btnLabel, btnClass;
  if (type === 'status') {
    title    = 'Confirm Action';
    body     = <>Set <span className="font-semibold">{name}</span> to <span className="font-semibold capitalize">{status}</span>?{status === 'archived' && <span className="block mt-1 text-gray-500 text-xs">The account will be disabled and hidden from active listings.</span>}</>;
    btnLabel = `Yes, ${status}`;
    btnClass = status === 'archived' || status === 'suspended' ? 'bg-yellow-500 hover:bg-yellow-600'
             : status === 'banned'   ? 'bg-red-500 hover:bg-red-600'
             : 'bg-green-500 hover:bg-green-600';
  } else if (type === 'verify') {
    title    = 'Verify Email';
    body     = <>Manually mark <span className="font-semibold">{name}</span>'s email as verified?</>;
    btnLabel = 'Yes, Verify';
    btnClass = 'bg-blue-600 hover:bg-blue-700';
  } else if (type === 'delete') {
    title    = 'Delete Account';
    body     = <><span className="text-red-600 font-semibold">This cannot be undone.</span> Delete <span className="font-semibold">{name}</span> and all associated data?</>;
    btnLabel = 'Delete Permanently';
    btnClass = 'bg-red-600 hover:bg-red-700';
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h4 className="text-lg font-bold">{title}</h4>
        <p className="text-sm text-gray-600">{body}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isPending} className={`flex-1 py-2 text-sm rounded-xl font-medium text-white disabled:opacity-50 ${btnClass}`}>
            {isPending ? 'Processing…' : btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STAFF SECTION
// ══════════════════════════════════════════════════════════════════════════════

function CreateStaffModal({ onClose, onSave, defaultRole = 'admin_content' }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: defaultRole, contactNumber: '' });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold">Create Staff Account</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Full Name *</label>
            <input value={form.name} onChange={f('name')} required className="input w-full" placeholder="Full name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
            <input value={form.email} onChange={f('email')} required type="email" className="input w-full" placeholder="Email address" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Role *</label>
            <select value={form.role} onChange={f('role')} className="input w-full">
              <option value="admin_content">Content Manager</option>
              <option value="admin_emergency">Emergency Officer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Initial Password *</label>
            <div className="relative">
              <input
                value={form.password} onChange={f('password')} required
                type={showPass ? 'text' : 'password'} minLength={8}
                className="input w-full pr-16" placeholder="Min. 8 characters"
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Share these credentials with the staff member securely.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contact Number</label>
            <input value={form.contactNumber} onChange={f('contactNumber')} className="input w-full" placeholder="+63..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 font-medium">
              {saving ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditStaffModal({ staff, onClose, onSave }) {
  const [form, setForm] = useState({
    name: staff.name ?? '', email: staff.email ?? '',
    role: staff.role ?? 'admin_content', contactNumber: staff.contactNumber ?? '',
  });
  const [saving, setSaving] = useState(false);
  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); onClose(); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold">Edit Staff Account</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
            <input value={form.name} onChange={f('name')} required className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input value={form.email} onChange={f('email')} required type="email" className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
            <select value={form.role} onChange={f('role')} className="input w-full">
              <option value="admin_content">Content Manager</option>
              <option value="admin_emergency">Emergency Officer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contact Number</label>
            <input value={form.contactNumber} onChange={f('contactNumber')} className="input w-full" placeholder="+63..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ROLE_TABS = [
  { key: '',                label: 'All Staff',           color: 'text-violet-600',  activeCls: 'border-violet-600 text-violet-600',  badge: null },
  { key: 'admin_content',   label: 'Content Managers',    color: 'text-blue-600',    activeCls: 'border-blue-600 text-blue-600',       badge: 'bg-blue-100 text-blue-700' },
  { key: 'admin_emergency', label: 'Emergency Officers',  color: 'text-red-600',     activeCls: 'border-red-600 text-red-600',         badge: 'bg-red-100 text-red-700'  },
];

// Mobile collapsible row for staff
function StaffMobileRow({ u, currentUser, onEdit, onConfirm }) {
  const [open, setOpen] = useState(false);
  const roleInfo = ROLE_STYLES[u.role];
  const isSelf   = u.id === currentUser?.id;
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <Avatar user={u} />
        <span className="flex-1 font-medium text-sm leading-snug break-words min-w-0">
          {u.name}{isSelf && <span className="ml-1 text-xs text-gray-400 font-normal">(you)</span>}
        </span>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${roleInfo?.cls}`}>
          {roleInfo?.label}
        </span>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-3">
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Email</dt>
              <dd className="font-medium break-all text-xs">{u.email}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Status</dt>
              <dd><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[u.status] ?? 'bg-gray-100 text-gray-500'}`}>{u.status}</span></dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Contact</dt>
              <dd className="text-gray-600 text-xs">{u.contactNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Joined</dt>
              <dd className="text-gray-600 text-xs">{new Date(u.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onEdit(u)}
              className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg">Edit</button>
            {u.status !== 'active' && (
              <button onClick={() => onConfirm({ type: 'status', id: u.id, name: u.name, status: 'active' })}
                className="text-xs px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg">Activate</button>
            )}
            {u.status === 'active' && (
              <button onClick={() => onConfirm({ type: 'status', id: u.id, name: u.name, status: 'suspended' })}
                className="text-xs px-3 py-1.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg">Suspend</button>
            )}
            {u.status !== 'archived' && (
              <button onClick={() => onConfirm({ type: 'status', id: u.id, name: u.name, status: 'archived' })}
                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg">Archive</button>
            )}
            {!isSelf && (
              <button onClick={() => onConfirm({ type: 'delete', id: u.id, name: u.name })}
                className="text-xs px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg">Delete</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StaffSection() {
  const qc = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  const [roleFilter, setRoleFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]             = useState('');
  const [showCreate, setShowCreate]     = useState(false);
  const [editStaff, setEditStaff]       = useState(null);
  const [confirm, setConfirm]           = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['staff', search, statusFilter, roleFilter],
    queryFn: () => api.get('/users/staff', {
      params: {
        search: search       || undefined,
        status: statusFilter || undefined,
        role:   roleFilter   || undefined,
      },
    }).then(r => r.data),
  });

  // Always fetch all staff (no filters) to power the role-tab badges
  const { data: allData } = useQuery({
    queryKey: ['staff-all-counts'],
    queryFn: () => api.get('/users/staff').then(r => r.data),
  });
  const allStaff = allData?.staff ?? [];

  const staff = data?.staff ?? [];
  const counts = {
    total:     staff.length,
    active:    staff.filter(s => s.status === 'active').length,
    suspended: staff.filter(s => s.status === 'suspended').length,
    archived:  staff.filter(s => s.status === 'archived').length,
  };
  const roleCounts = {
    admin_content:   allStaff.filter(s => s.role === 'admin_content').length,
    admin_emergency: allStaff.filter(s => s.role === 'admin_emergency').length,
  };

  const invalidate = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['staff'] }),
    qc.invalidateQueries({ queryKey: ['staff-all-counts'] }),
  ]);

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/users/staff', data),
    onSuccess: async () => { await invalidate(); toast.success('Staff account created'); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Create failed'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/users/staff/${id}`, data),
    onSuccess: async () => { await invalidate(); toast.success('Staff account updated'); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Update failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/users/${id}/status`, { status }),
    onSuccess: async (_, { status }) => { await invalidate(); toast.success(`Account ${status}`); setConfirm(null); },
    onError: (err) => { toast.error(err?.response?.data?.error || 'Action failed'); setConfirm(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/staff/${id}`),
    onSuccess: async () => { await invalidate(); toast.success('Staff account deleted'); setConfirm(null); },
    onError: (err) => { toast.error(err?.response?.data?.error || 'Delete failed'); setConfirm(null); },
  });

  const isPending = statusMutation.isPending || deleteMutation.isPending;

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.type === 'status') statusMutation.mutate({ id: confirm.id, status: confirm.status });
    else if (confirm.type === 'delete') deleteMutation.mutate(confirm.id);
  };

  const STATUS_FILTER_TABS = [
    { key: '',          label: 'All' },
    { key: 'active',    label: 'Active' },
    { key: 'suspended', label: 'Suspended' },
    { key: 'archived',  label: 'Archived' },
  ];

  const switchRole = (key) => { setRoleFilter(key); setStatusFilter(''); setSearch(''); };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff',  value: counts.total,     color: 'text-violet-600' },
          { label: 'Active',       value: counts.active,    color: 'text-green-600' },
          { label: 'Suspended',    value: counts.suspended, color: 'text-yellow-600' },
          { label: 'Archived',     value: counts.archived,  color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Role sub-tabs */}
      <div className="flex border-b border-gray-200">
        {ROLE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => switchRole(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              roleFilter === tab.key ? tab.activeCls : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
            {tab.key === 'admin_content' && roleCounts.admin_content > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${tab.badge}`}>
                {roleCounts.admin_content}
              </span>
            )}
            {tab.key === 'admin_emergency' && roleCounts.admin_emergency > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${tab.badge}`}>
                {roleCounts.admin_emergency}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input max-w-xs" placeholder="Search name or email…" />
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          {STATUS_FILTER_TABS.map(t => (
            <button key={t.key} onClick={() => setStatusFilter(t.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === t.key ? 'bg-violet-600 text-white' : 'hover:bg-gray-50 text-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700">
          <PlusIcon className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {/* List / Table */}
      <div className="card p-0 overflow-hidden">
        {/* Mobile: collapsible rows */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-4 py-12 text-center text-gray-400">Loading…</div>
          ) : staff.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-400">No staff accounts found</div>
          ) : staff.map(u => (
            <StaffMobileRow key={u.id} u={u} currentUser={currentUser} onEdit={setEditStaff} onConfirm={setConfirm} />
          ))}
        </div>
        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Joined</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No staff accounts found</td></tr>
              ) : staff.map(u => {
                const roleInfo = ROLE_STYLES[u.role];
                const isSelf   = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} />
                        <div>
                          <span className="font-medium">{u.name}</span>
                          {isSelf && <span className="ml-1.5 text-xs text-gray-400">(you)</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleInfo?.cls}`}>
                        {roleInfo?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{u.contactNumber || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[u.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => setEditStaff(u)}
                          className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg">
                          Edit
                        </button>
                        {u.status !== 'active' && (
                          <button onClick={() => setConfirm({ type: 'status', id: u.id, name: u.name, status: 'active' })}
                            className="text-xs px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg">
                            Activate
                          </button>
                        )}
                        {u.status === 'active' && (
                          <button onClick={() => setConfirm({ type: 'status', id: u.id, name: u.name, status: 'suspended' })}
                            className="text-xs px-2.5 py-1 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg">
                            Suspend
                          </button>
                        )}
                        {u.status !== 'archived' && (
                          <button onClick={() => setConfirm({ type: 'status', id: u.id, name: u.name, status: 'archived' })}
                            className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg">
                            Archive
                          </button>
                        )}
                        {!isSelf && (
                          <button onClick={() => setConfirm({ type: 'delete', id: u.id, name: u.name })}
                            className="text-xs px-2.5 py-1 bg-red-600 text-white hover:bg-red-700 rounded-lg">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateStaffModal
          onClose={() => setShowCreate(false)}
          onSave={(formData) => createMutation.mutateAsync(formData)}
          defaultRole={roleFilter || 'admin_content'}
        />
      )}
      {editStaff && (
        <EditStaffModal
          staff={editStaff}
          onClose={() => setEditStaff(null)}
          onSave={(formData) => editMutation.mutateAsync({ id: editStaff.id, data: formData })}
        />
      )}
      <ConfirmDialog action={confirm} isPending={isPending} onConfirm={handleConfirm} onCancel={() => setConfirm(null)} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TOURIST SECTION
// ══════════════════════════════════════════════════════════════════════════════

function EditTouristModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    name: user.name ?? '', email: user.email ?? '',
    nationality: user.nationality ?? '', contactNumber: user.contactNumber ?? '',
    isVerified: user.isVerified ?? false,
  });
  const [saving, setSaving] = useState(false);
  const f  = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const fc = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.checked }));
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); onClose(); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold">Edit Tourist</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
            <input value={form.name} onChange={f('name')} required className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input value={form.email} onChange={f('email')} required type="email" className="input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nationality</label>
              <input value={form.nationality} onChange={f('nationality')} className="input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contact</label>
              <input value={form.contactNumber} onChange={f('contactNumber')} className="input w-full" placeholder="+63..." />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.isVerified} onChange={fc('isVerified')} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-gray-700">Email Verified</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const TOURIST_TABS = [
  { key: '',          label: 'All Users' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'banned',    label: 'Banned' },
];
const PAGE_SIZE = 20;

// Mobile collapsible row for tourists
function TouristMobileRow({ u, isSuperAdmin, onSelect, onEdit, onConfirm }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <Avatar user={u} />
        <span className="flex-1 font-medium text-sm leading-snug break-words min-w-0">{u.name}</span>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[u.status]}`}>
          {u.status}
        </span>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-3">
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Email</dt>
              <dd className="font-medium break-all text-xs">{u.email}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Nationality</dt>
              <dd className="text-gray-600 text-xs">{u.nationality || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Verified</dt>
              <dd>
                {u.isVerified
                  ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Verified</span>
                  : <span className="text-gray-400 text-xs">Unverified</span>}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Last Active</dt>
              <dd className="text-gray-600 text-xs">
                {u.lastActive ? formatDistanceToNow(new Date(u.lastActive), { addSuffix: true }) : 'Never'}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onSelect(u.id)}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg">View</button>
            {isSuperAdmin && (
              <button onClick={() => onEdit(u)}
                className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg">Edit</button>
            )}
            {!u.isVerified && (
              <button onClick={() => onConfirm({ type: 'verify', id: u.id, name: u.name })}
                className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg">Verify</button>
            )}
            {isSuperAdmin && (<>
              {u.status !== 'active' && (
                <button onClick={() => onConfirm({ type: 'status', id: u.id, name: u.name, status: 'active' })}
                  className="text-xs px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg">Activate</button>
              )}
              {u.status === 'active' && (
                <button onClick={() => onConfirm({ type: 'status', id: u.id, name: u.name, status: 'suspended' })}
                  className="text-xs px-3 py-1.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg">Suspend</button>
              )}
              {u.status !== 'banned' && (
                <button onClick={() => onConfirm({ type: 'status', id: u.id, name: u.name, status: 'banned' })}
                  className="text-xs px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg">Ban</button>
              )}
              <button onClick={() => onConfirm({ type: 'delete', id: u.id, name: u.name })}
                className="text-xs px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg">Delete</button>
            </>)}
          </div>
        </div>
      )}
    </div>
  );
}

function TouristSection() {
  const qc = useQueryClient();
  const isSuperAdmin = useAuthStore(s => s.user?.role === 'admin_super');
  const [activeTab, setActiveTab]   = useState('');
  const [search, setSearch]         = useState('');
  const [nationality, setNat]       = useState('');
  const [page, setPage]             = useState(1);
  const [selected, setSelected]     = useState(null);
  const [confirm, setConfirm]       = useState(null);
  const [editUser, setEditUser]     = useState(null);

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => api.get('/users/stats').then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, activeTab, nationality, page],
    queryFn: () => api.get('/users', { params: { search: search || undefined, status: activeTab || undefined, nationality: nationality || undefined, page, limit: PAGE_SIZE } }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: userDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['user', selected],
    queryFn: () => api.get(`/users/${selected}`).then(r => r.data),
    enabled: !!selected,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;
  const invalidate = () => Promise.all([qc.invalidateQueries({ queryKey: ['users'] }), qc.invalidateQueries({ queryKey: ['user-stats'] })]);

  const verifyPictureMutation = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/verify-picture`, {}, { skipToast: true }),
    onSuccess: async (res, id) => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['users'] }), qc.invalidateQueries({ queryKey: ['user', id] })]);
      const { verified, reason } = res.data;
      if (verified) toast.success('Picture verified — real human face');
      else toast.error(`Picture rejected — ${reason}`, { duration: 6000 });
    },
    onError: (err) => {
      const msg  = err?.response?.data?.error;
      const hint = err?.response?.data?.hint;
      toast.error(msg || 'Verification failed', { duration: 6000 });
      if (hint) toast(hint, { icon: '💡', duration: 8000 });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/users/${id}/status`, { status }),
    onSuccess: async (_, { status }) => {
      await invalidate(); if (selected) await qc.invalidateQueries({ queryKey: ['user', selected] });
      toast.success(`User ${status}`); setConfirm(null);
    },
    onError: (err) => { toast.error(err?.response?.data?.error || 'Action failed'); setConfirm(null); },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/users/${id}`, data),
    onSuccess: async (_, { id }) => { await invalidate(); qc.invalidateQueries({ queryKey: ['user', id] }); toast.success('User updated'); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Update failed'),
  });

  const manualVerifyMutation = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/verify`),
    onSuccess: async (_, id) => { await invalidate(); qc.invalidateQueries({ queryKey: ['user', id] }); toast.success('Email verified'); setConfirm(null); },
    onError: (err) => { toast.error(err?.response?.data?.error || 'Verification failed'); setConfirm(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: async (_, id) => {
      await invalidate(); if (selected === id) setSelected(null);
      toast.success('User deleted'); setConfirm(null);
    },
    onError: (err) => { toast.error(err?.response?.data?.error || 'Delete failed'); setConfirm(null); },
  });

  const isPending = statusMutation.isPending || manualVerifyMutation.isPending || deleteMutation.isPending;

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.type === 'status')  statusMutation.mutate({ id: confirm.id, status: confirm.status });
    else if (confirm.type === 'verify') manualVerifyMutation.mutate(confirm.id);
    else if (confirm.type === 'delete') deleteMutation.mutate(confirm.id);
  };

  const switchTab = (key) => { setActiveTab(key); setPage(1); };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Tourists', value: stats?.total,     color: 'text-blue-600' },
          { label: 'Active',         value: stats?.active,    color: 'text-green-600' },
          { label: 'Suspended',      value: stats?.suspended, color: 'text-yellow-600' },
          { label: 'Banned',         value: stats?.banned,    color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TOURIST_TABS.map(tab => (
          <button key={tab.key} onClick={() => switchTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            {tab.label}
            {tab.key === 'suspended' && stats?.suspended > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">{stats.suspended}</span>
            )}
            {tab.key === 'banned' && stats?.banned > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">{stats.banned}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="input max-w-xs" placeholder="Search name or email…" />
        <input value={nationality} onChange={e => { setNat(e.target.value); setPage(1); }}
          className="input max-w-[160px]" placeholder="Nationality…" />
        {(search || nationality) && (
          <button onClick={() => { setSearch(''); setNat(''); setPage(1); }} className="text-sm text-gray-500 hover:text-gray-800 underline">
            Clear
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500">
          {data ? `${data.total} tourist${data.total !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {/* List / Table */}
      <div className="card p-0 overflow-hidden">
        {/* Mobile: collapsible rows */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-4 py-12 text-center text-gray-400">Loading…</div>
          ) : !data?.users?.length ? (
            <div className="px-4 py-12 text-center text-gray-400">No users found</div>
          ) : data.users.map(u => (
            <TouristMobileRow
              key={u.id}
              u={u}
              isSuperAdmin={isSuperAdmin}
              onSelect={setSelected}
              onEdit={setEditUser}
              onConfirm={setConfirm}
            />
          ))}
        </div>
        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Nationality</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Verified</th>
                <th className="px-6 py-3 font-medium">Last Active</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : !data?.users?.length ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No users found</td></tr>
              ) : data.users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar user={u} />
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4 text-gray-600">{u.nationality || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[u.status]}`}>{u.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    {u.isVerified
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Verified</span>
                      : <span className="text-gray-400 text-xs">Unverified</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {u.lastActive ? formatDistanceToNow(new Date(u.lastActive), { addSuffix: true }) : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => setSelected(u.id)}
                        className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg">View</button>
                      {isSuperAdmin && (
                        <button onClick={() => setEditUser(u)}
                          className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg">Edit</button>
                      )}
                      {!u.isVerified && (
                        <button onClick={() => setConfirm({ type: 'verify', id: u.id, name: u.name })}
                          className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg">Verify</button>
                      )}
                      {isSuperAdmin && (
                        <>
                          {u.status !== 'active' && (
                            <button onClick={() => setConfirm({ type: 'status', id: u.id, name: u.name, status: 'active' })}
                              className="text-xs px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg">Activate</button>
                          )}
                          {u.status === 'active' && (
                            <button onClick={() => setConfirm({ type: 'status', id: u.id, name: u.name, status: 'suspended' })}
                              className="text-xs px-2.5 py-1 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg">Suspend</button>
                          )}
                          {u.status !== 'banned' && (
                            <button onClick={() => setConfirm({ type: 'status', id: u.id, name: u.name, status: 'banned' })}
                              className="text-xs px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg">Ban</button>
                          )}
                          <button onClick={() => setConfirm({ type: 'delete', id: u.id, name: u.name })}
                            className="text-xs px-2.5 py-1 bg-red-600 text-white hover:bg-red-700 rounded-lg">Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {detailLoading ? <p className="text-center text-gray-400 py-8">Loading…</p>
            : userDetail ? (
              <>
                <div className="flex items-center gap-4">
                  <Avatar user={userDetail.user} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold truncate">{userDetail.user.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{userDetail.user.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${STATUS_STYLES[userDetail.user.status]}`}>
                    {userDetail.user.status}
                  </span>
                </div>

                {userDetail.user.profilePicture && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 text-sm">
                      {userDetail.user.profilePictureVerified === true  && <><CheckBadgeIcon className="w-4 h-4 text-green-500" /><span className="text-green-700 font-medium">Picture verified</span></>}
                      {userDetail.user.profilePictureVerified === false && <><XCircleIcon    className="w-4 h-4 text-red-400" /><span className="text-red-600 font-medium">Picture rejected</span></>}
                      {userDetail.user.profilePictureVerified == null   && <span className="text-gray-400">Picture not verified yet</span>}
                    </div>
                    <button onClick={() => verifyPictureMutation.mutate(userDetail.user.id)}
                      disabled={verifyPictureMutation.isPending}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40">
                      <SparklesIcon className={`w-3.5 h-3.5 ${verifyPictureMutation.isPending ? 'animate-pulse' : ''}`} />
                      {verifyPictureMutation.isPending ? 'Verifying…' : 'Verify with AI'}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div><p className="text-gray-400 text-xs">Name</p><p className="font-medium">{userDetail.user.name}</p></div>
                  <div><p className="text-gray-400 text-xs">Email</p><p>{userDetail.user.email}</p></div>
                  <div><p className="text-gray-400 text-xs">Nationality</p><p>{userDetail.user.nationality || '—'}</p></div>
                  <div><p className="text-gray-400 text-xs">Contact</p><p>{userDetail.user.contactNumber || '—'}</p></div>
                  <div><p className="text-gray-400 text-xs">Email Verified</p><p>{userDetail.user.isVerified ? <span className="text-blue-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</p></div>
                  <div><p className="text-gray-400 text-xs">Joined</p><p>{new Date(userDetail.user.createdAt).toLocaleDateString()}</p></div>
                  <div><p className="text-gray-400 text-xs">Last Active</p><p>{userDetail.user.lastActive ? formatDistanceToNow(new Date(userDetail.user.lastActive), { addSuffix: true }) : 'Never'}</p></div>
                </div>

                {userDetail.incidents?.length > 0 && (
                  <div>
                    <p className="font-medium text-sm mb-2">Incident Reports <span className="text-gray-400 font-normal">({userDetail.incidents.length})</span></p>
                    <div className="space-y-1">
                      {userDetail.incidents.map(inc => (
                        <div key={inc.id} className="flex items-center justify-between text-xs text-gray-600 py-1.5 border-b last:border-0">
                          <span className="capitalize font-medium">{inc.type.replace(/_/g, ' ')}</span>
                          <span className={`px-2 py-0.5 rounded-full ${inc.status === 'resolved' ? 'bg-green-100 text-green-700' : inc.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{inc.status.replace('_', ' ')}</span>
                          <span className="text-gray-400">{new Date(inc.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  {isSuperAdmin && (
                    <button onClick={() => { setSelected(null); setEditUser(userDetail.user); }}
                      className="flex-1 text-sm py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-medium">Edit</button>
                  )}
                  {!userDetail.user.isVerified && (
                    <button onClick={() => setConfirm({ type: 'verify', id: userDetail.user.id, name: userDetail.user.name })}
                      className="flex-1 text-sm py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-medium">Verify Email</button>
                  )}
                  {isSuperAdmin && (<>
                    {userDetail.user.status !== 'active' && (
                      <button onClick={() => setConfirm({ type: 'status', id: userDetail.user.id, name: userDetail.user.name, status: 'active' })}
                        className="flex-1 text-sm py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl font-medium">Activate</button>
                    )}
                    {userDetail.user.status === 'active' && (
                      <button onClick={() => setConfirm({ type: 'status', id: userDetail.user.id, name: userDetail.user.name, status: 'suspended' })}
                        className="flex-1 text-sm py-2 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-xl font-medium">Suspend</button>
                    )}
                    {userDetail.user.status !== 'banned' && (
                      <button onClick={() => setConfirm({ type: 'status', id: userDetail.user.id, name: userDetail.user.name, status: 'banned' })}
                        className="flex-1 text-sm py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl font-medium">Ban</button>
                    )}
                    <button onClick={() => { setSelected(null); setConfirm({ type: 'delete', id: userDetail.user.id, name: userDetail.user.name }); }}
                      className="flex-1 text-sm py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl font-medium">Delete</button>
                  </>)}
                </div>
                <button onClick={() => setSelected(null)} className="btn-secondary w-full">Close</button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {editUser && (
        <EditTouristModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={(formData) => editMutation.mutateAsync({ id: editUser.id, data: formData })}
        />
      )}

      <ConfirmDialog action={confirm} isPending={isPending} onConfirm={handleConfirm} onCancel={() => setConfirm(null)} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
const SECTIONS = [
  { key: 'staff',    label: 'Staff Accounts',   icon: ShieldCheckIcon, desc: 'Content Managers & Emergency Officers' },
  { key: 'tourists', label: 'Tourist Accounts',  icon: UserGroupIcon,   desc: 'Registered app users' },
];

export default function Users() {
  const [section, setSection] = useState('staff');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <p className="text-gray-500 text-sm">Manage staff and tourist accounts</p>
      </div>

      {/* Section switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const active = section === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                active
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${active ? 'bg-violet-600' : 'bg-gray-100'}`}>
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className={`font-semibold text-sm ${active ? 'text-violet-700' : 'text-gray-800'}`}>{s.label}</p>
                <p className={`text-xs ${active ? 'text-violet-500' : 'text-gray-400'}`}>{s.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {section === 'staff'    && <StaffSection />}
      {section === 'tourists' && <TouristSection />}
    </div>
  );
}
