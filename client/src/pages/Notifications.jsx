import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { PaperAirplaneIcon, XMarkIcon, MagnifyingGlassIcon, TrashIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useMeta } from '../hooks/useMeta';
import { format } from 'date-fns';

const defaultForm = {
  title: '', body: '', type: 'announcement', priority: 'normal',
  target: { type: 'all' }, scheduledAt: '',
};

const STATUS_CLS = {
  sent:    'bg-green-100 text-green-700',
  failed:  'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
};

const TARGET_LABEL = (target) => {
  if (target?.type === 'nationality') return `🌍 ${target.value}`;
  if (target?.type === 'specific')    return '👤 Specific User';
  return '🌐 All Users';
};

function NotificationMobileRow({ n, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="flex-1 font-medium text-sm leading-snug break-words min-w-0">{n.title}</span>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[n.status] ?? STATUS_CLS.pending}`}>
          {n.status}
        </span>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-3">
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Type</dt>
              <dd className="capitalize text-gray-700">{n.type.replace('_', ' ')}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Target</dt>
              <dd className="text-gray-700">{TARGET_LABEL(n.target)}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Priority</dt>
              <dd>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${n.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                  {n.priority}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Sent</dt>
              <dd className="text-gray-700 text-xs">{n.sentAt ? format(new Date(n.sentAt), 'MMM d, h:mm a') : '—'}</dd>
            </div>
          </dl>
          <div>
            <button
              onClick={() => onDelete({ id: n.id, title: n.title })}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg">
              <TrashIcon className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Convert snake_case enum value to Title Case label
const fmtType = (t) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function Notifications() {
  const qc = useQueryClient();
  const { notification: notifMeta } = useMeta();
  const [form, setForm] = useState(defaultForm);
  const [showCompose, setShowCompose] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, title } | null
  const [typeFilter,   setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search,       setSearch]       = useState('');
  const searchTimer = useRef(null);
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('');
  const [debouncedSearch,     setDebouncedSearch]     = useState('');

  // Debounce userSearch so the query doesn't fire on every keystroke
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedUserSearch(userSearch), 300);
    return () => clearTimeout(searchTimer.current);
  }, [userSearch]);

  // Debounce notification search
  const searchTimer2 = useRef(null);
  useEffect(() => {
    clearTimeout(searchTimer2.current);
    searchTimer2.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimer2.current);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', typeFilter, statusFilter, debouncedSearch],
    queryFn: () => api.get('/notifications', {
      params: {
        type:   typeFilter       || undefined,
        status: statusFilter     || undefined,
        search: debouncedSearch  || undefined,
        limit: 50,
      },
    }).then(r => r.data),
  });

  // Fetch users for specific target — debounced to avoid per-keystroke requests
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users-search', debouncedUserSearch],
    queryFn: () => api.get('/users', { params: { search: debouncedUserSearch || undefined, limit: 20 } }).then(r => r.data),
    enabled: showCompose && form.target.type === 'specific' && !selectedUser,
    staleTime: 30000,
  });

  // Fetch registered nationalities only when nationality target is active
  const { data: natData, isLoading: natLoading } = useQuery({
    queryKey: ['user-nationalities'],
    queryFn: () => api.get('/users/nationalities').then(r => r.data),
    enabled: showCompose && form.target.type === 'nationality',
    staleTime: 60000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Failed to delete notification'),
  });

  const sendMutation = useMutation({
    mutationFn: (body) => api.post('/notifications', body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification sent!');
      setForm(defaultForm); setShowCompose(false);
    },
    onError: () => toast.error('Failed to send notification'),
  });

  const setTarget = (type, value) => {
    setForm(f => ({ ...f, target: { type, value } }));
    if (type !== 'specific') { setSelectedUser(null); setUserSearch(''); }
  };

  const closeCompose = () => {
    setShowCompose(false);
    setForm(defaultForm);
    setSelectedUser(null);
    setUserSearch('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Announcements & Notifications</h2>
          <p className="text-gray-500 text-sm">{data?.total ?? 0} total</p>
        </div>
        <button onClick={() => setShowCompose(true)} className="btn-primary flex items-center gap-2">
          <PaperAirplaneIcon className="w-4 h-4" /> Compose
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input max-w-xs"
          placeholder="Search title…"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input w-auto">
          <option value="">All Types</option>
          {notifMeta.types.map(t => (
            <option key={t} value={t}>{fmtType(t)}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">All Status</option>
          {notifMeta.statuses.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        {(search || typeFilter || statusFilter) && (
          <button
            onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); }}
            className="text-sm text-gray-500 hover:text-gray-800 underline">
            Clear
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500">{data?.total ?? 0} total</span>
      </div>

      {/* Notification log */}
      <div className="card p-0 overflow-hidden">
        {/* Mobile: collapsible rows */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-4 py-12 text-center text-gray-400">Loading...</div>
          ) : !data?.notifications?.length ? (
            <div className="px-4 py-12 text-center text-gray-400">No notifications found</div>
          ) : data.notifications.map(n => (
            <NotificationMobileRow key={n.id} n={n} onDelete={setDeleteConfirm} />
          ))}
        </div>
        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-3 font-medium">Title</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Target</th>
                <th className="px-6 py-3 font-medium">Priority</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Sent</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : data?.notifications?.map(n => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium max-w-xs truncate">{n.title}</td>
                  <td className="px-6 py-4 capitalize text-gray-600">{n.type.replace('_', ' ')}</td>
                  <td className="px-6 py-4 text-gray-600">{TARGET_LABEL(n.target)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      n.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>{n.priority}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[n.status] ?? STATUS_CLS.pending}`}>{n.status}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {n.sentAt ? format(new Date(n.sentAt), 'MMM d, h:mm a') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setDeleteConfirm({ id: n.id, title: n.title })}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirm dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <TrashIcon className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Notification</h3>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong className="text-gray-900">"{deleteConfirm.title}"</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold">Compose Notification</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="Notification title" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} className="input h-24 resize-none" placeholder="Notification body..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input">
                    {notifMeta.types.map(t => (
                      <option key={t} value={t}>{fmtType(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input">
                    {notifMeta.priorities.map(p => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}{p === 'high' ? ' (bypasses silent mode)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Audience</label>
                <select value={form.target.type} onChange={e => setTarget(e.target.value, null)} className="input">
                  <option value="all">🌐 All Users</option>
                  <option value="nationality">🌍 By Nationality</option>
                  <option value="specific">👤 Specific User</option>
                </select>

                {form.target.type === 'nationality' && (
                  <div className="mt-2">
                    {natLoading ? (
                      <div className="input flex items-center gap-2 text-gray-400">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Loading registered nationalities…
                      </div>
                    ) : natData?.nationalities?.length > 0 ? (
                      <>
                        <select
                          className="input"
                          value={form.target.value ?? ''}
                          onChange={e => setTarget('nationality', e.target.value)}
                        >
                          <option value="">— Select nationality —</option>
                          {natData.nationalities.map(n => (
                            <option key={n.name} value={n.name}>
                              {n.name} ({n.count} {n.count === 1 ? 'user' : 'users'})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Only nationalities with registered users are listed.</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1 italic">No users have registered with a nationality yet.</p>
                    )}
                  </div>
                )}

                {form.target.type === 'specific' && (
                  <div className="mt-2">
                    {selectedUser ? (
                      // Selected user card
                      <div className="flex items-center gap-3 p-3 bg-sky-50 border border-sky-200 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{selectedUser.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {selectedUser.email}
                            {selectedUser.nationality && <span className="ml-1">· {selectedUser.nationality}</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => { setSelectedUser(null); setTarget('specific', null); }}
                          className="text-gray-400 hover:text-red-500 flex-shrink-0 transition-colors"
                          title="Remove"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Search input */}
                        <div className="relative">
                          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            className="input pl-9"
                            placeholder="Search by name or email…"
                            value={userSearch}
                            onChange={e => setUserSearch(e.target.value)}
                            autoFocus
                          />
                          {userSearch && (
                            <button
                              onClick={() => setUserSearch('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {/* User list */}
                        <div className="mt-2 max-h-52 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                          {usersLoading ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                              </svg>
                              Loading users…
                            </div>
                          ) : usersData?.users?.length > 0 ? usersData.users.map(u => (
                            <button
                              key={u.id}
                              onClick={() => { setSelectedUser(u); setTarget('specific', u.id); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-sky-50 text-left transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  {u.email}
                                  {u.nationality && <span className="ml-1">· {u.nationality}</span>}
                                </p>
                              </div>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}>{u.status}</span>
                            </button>
                          )) : (
                            <p className="text-sm text-gray-400 text-center py-6 italic">
                              {userSearch ? `No users found for "${userSearch}"` : 'No users found'}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Schedule (optional — leave blank to send now)</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="input" />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={closeCompose} className="btn-secondary">Cancel</button>
              <button
                onClick={() => sendMutation.mutate(form)}
                disabled={
                  sendMutation.isPending ||
                  !form.title.trim() ||
                  !form.body.trim() ||
                  (form.target.type === 'nationality' && !form.target.value) ||
                  (form.target.type === 'specific' && !form.target.value)
                }
                className="btn-primary flex items-center gap-2"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                {sendMutation.isPending ? 'Sending...' : form.scheduledAt ? 'Schedule' : 'Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
