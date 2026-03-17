import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { SparklesIcon, CheckBadgeIcon, XCircleIcon } from '@heroicons/react/24/solid';

const STATUS_STYLES = {
  active:    'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  banned:    'bg-red-100 text-red-700',
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

function VerificationBadge({ verified, size }) {
  if (verified === true)  return <CheckBadgeIcon className={`${size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} text-green-500 bg-white rounded-full absolute bottom-0 right-0`} />;
  if (verified === false) return <XCircleIcon    className={`${size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} text-red-400   bg-white rounded-full absolute bottom-0 right-0`} />;
  return null;
}

function Avatar({ user, size = 'sm' }) {
  const [imgErr, setImgErr] = useState(false);
  const sizeClass = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-8 h-8 text-xs';
  const initials = <div className={`${sizeClass} ${getAvatarColor(user?.name)} rounded-full flex items-center justify-center text-white font-semibold`}>{getInitials(user?.name)}</div>;
  const inner = user?.profilePicture && !imgErr
    ? <img src={user.profilePicture} alt={user.name} className={`${sizeClass} rounded-full object-cover`} onError={() => setImgErr(true)} />
    : initials;

  return (
    <div className="relative shrink-0 inline-flex">
      {inner}
      {user?.profilePicture && !imgErr && <VerificationBadge verified={user.profilePictureVerified} size={size} />}
    </div>
  );
}

const PAGE_SIZE = 20;

export default function Users() {
  const qc = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  const isSuperAdmin = currentUser?.role === 'admin_super';

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [nationality, setNationality]   = useState('');
  const [page, setPage]                 = useState(1);
  const [selected, setSelected]         = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { id, status, name }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => api.get('/users/stats').then(r => r.data),
  });

  // ── User list ──────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['users', search, statusFilter, nationality, page],
    queryFn: () =>
      api.get('/users', {
        params: {
          search:      search      || undefined,
          status:      statusFilter || undefined,
          nationality: nationality  || undefined,
          page,
          limit: PAGE_SIZE,
        },
      }).then(r => r.data),
    keepPreviousData: true,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  // ── User detail ────────────────────────────────────────────────────────────
  const { data: userDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['user', selected],
    queryFn: () => api.get(`/users/${selected}`).then(r => r.data),
    enabled: !!selected,
  });

  // ── Verify picture mutation ─────────────────────────────────────────────────
  const verifyMutation = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/verify-picture`, {}, { skipToast: true }),
    onSuccess: (res, id) => {
      qc.invalidateQueries(['users']);
      qc.invalidateQueries(['user', id]);
      const { verified, reason } = res.data;
      if (verified) {
        toast.success(`Picture verified — real human face`);
      } else {
        toast.error(`Picture rejected — ${reason}`, { duration: 6000 });
      }
    },
    onError: (err) => {
      const msg  = err?.response?.data?.error;
      const hint = err?.response?.data?.hint;
      toast.error(msg || 'Verification failed', { duration: 6000 });
      if (hint) toast(hint, { icon: '💡', duration: 8000 });
    },
  });

  // ── Status mutation ────────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/users/${id}/status`, { status }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries(['users']);
      qc.invalidateQueries(['user-stats']);
      if (selected) qc.invalidateQueries(['user', selected]);
      toast.success(`User ${status}`);
      setConfirmAction(null);
    },
  });

  const handleStatusChange = (user, status) => {
    setConfirmAction({ id: user.id, name: user.name, status });
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setNationality('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <p className="text-gray-500 text-sm">Manage tourist accounts and statuses</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Tourists', value: stats?.total ?? '—', color: 'text-blue-600' },
          { label: 'Active',         value: stats?.active ?? '—', color: 'text-green-600' },
          { label: 'Suspended',      value: stats?.suspended ?? '—', color: 'text-yellow-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="input max-w-xs"
          placeholder="Search name or email..."
        />
        <input
          value={nationality}
          onChange={e => { setNationality(e.target.value); setPage(1); }}
          className="input max-w-[160px]"
          placeholder="Nationality..."
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input max-w-[160px]"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
        {(search || statusFilter || nationality) && (
          <button onClick={resetFilters} className="text-sm text-gray-500 hover:text-gray-800 underline">
            Clear filters
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500">
          {data ? `${data.total} user${data.total !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
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
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : !data?.users?.length ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No users found
                    {(search || statusFilter || nationality) && (
                      <button onClick={resetFilters} className="ml-2 text-blue-500 hover:underline">
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : data.users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar user={u} size="sm" />
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4 text-gray-600">{u.nationality || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[u.status]}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.isVerified
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Verified</span>
                      : <span className="text-gray-400 text-xs">Unverified</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {u.lastActive
                      ? formatDistanceToNow(new Date(u.lastActive), { addSuffix: true })
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setSelected(u.id)}
                        className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        View
                      </button>
                      {isSuperAdmin && (
                        <>
                          {u.status !== 'active' && (
                            <button
                              onClick={() => handleStatusChange(u, 'active')}
                              className="text-xs px-3 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg"
                            >
                              Activate
                            </button>
                          )}
                          {u.status === 'active' && (
                            <button
                              onClick={() => handleStatusChange(u, 'suspended')}
                              className="text-xs px-3 py-1 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg"
                            >
                              Suspend
                            </button>
                          )}
                          {u.status !== 'banned' && (
                            <button
                              onClick={() => handleStatusChange(u, 'banned')}
                              className="text-xs px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg"
                            >
                              Ban
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {detailLoading ? (
              <p className="text-center text-gray-400 py-8">Loading...</p>
            ) : userDetail ? (
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

                {/* Profile picture verification */}
                {userDetail.user.profilePicture && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 text-sm">
                      {userDetail.user.profilePictureVerified === true  && <><CheckBadgeIcon className="w-4 h-4 text-green-500" /><span className="text-green-700 font-medium">Picture verified</span></>}
                      {userDetail.user.profilePictureVerified === false && <><XCircleIcon    className="w-4 h-4 text-red-400"   /><span className="text-red-600 font-medium">Picture rejected</span></>}
                      {userDetail.user.profilePictureVerified == null   && <span className="text-gray-400">Picture not verified yet</span>}
                    </div>
                    <button
                      onClick={() => verifyMutation.mutate(userDetail.user.id)}
                      disabled={verifyMutation.isPending}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <SparklesIcon className={`w-3.5 h-3.5 ${verifyMutation.isPending ? 'animate-pulse' : ''}`} />
                      {verifyMutation.isPending ? 'Verifying…' : 'Verify with AI'}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div><p className="text-gray-400 text-xs">Name</p><p className="font-medium">{userDetail.user.name}</p></div>
                  <div><p className="text-gray-400 text-xs">Email</p><p>{userDetail.user.email}</p></div>
                  <div><p className="text-gray-400 text-xs">Nationality</p><p>{userDetail.user.nationality || '—'}</p></div>
                  <div><p className="text-gray-400 text-xs">Language</p><p>{userDetail.user.language?.toUpperCase()}</p></div>
                  <div><p className="text-gray-400 text-xs">Contact</p><p>{userDetail.user.contactNumber || '—'}</p></div>
                  <div>
                    <p className="text-gray-400 text-xs">Verified</p>
                    <p>{userDetail.user.isVerified
                      ? <span className="text-blue-600 font-medium">Yes</span>
                      : <span className="text-gray-400">No</span>}
                    </p>
                  </div>
                  <div><p className="text-gray-400 text-xs">Joined</p><p>{new Date(userDetail.user.createdAt).toLocaleDateString()}</p></div>
                  <div>
                    <p className="text-gray-400 text-xs">Last Active</p>
                    <p>{userDetail.user.lastActive
                      ? formatDistanceToNow(new Date(userDetail.user.lastActive), { addSuffix: true })
                      : 'Never'}
                    </p>
                  </div>
                </div>

                {userDetail.user.emergencyContacts?.length > 0 && (
                  <div>
                    <p className="font-medium text-sm mb-2">Emergency Contacts</p>
                    <div className="space-y-1">
                      {userDetail.user.emergencyContacts.map((c, i) => (
                        <p key={i} className="text-sm text-gray-600">
                          {c.name} <span className="text-gray-400">({c.relationship})</span> — {c.phone}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {userDetail.incidents?.length > 0 && (
                  <div>
                    <p className="font-medium text-sm mb-2">
                      Incident Reports <span className="text-gray-400 font-normal">({userDetail.incidents.length})</span>
                    </p>
                    <div className="space-y-1">
                      {userDetail.incidents.map(inc => (
                        <div key={inc.id} className="flex items-center justify-between text-xs text-gray-600 py-1.5 border-b last:border-0">
                          <span className="capitalize font-medium">{inc.type.replace(/_/g, ' ')}</span>
                          <span className={`px-2 py-0.5 rounded-full ${
                            inc.status === 'resolved' ? 'bg-green-100 text-green-700' :
                            inc.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{inc.status.replace('_', ' ')}</span>
                          <span className="text-gray-400">{new Date(inc.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status actions inside modal (super admin only) */}
                {isSuperAdmin && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {userDetail.user.status !== 'active' && (
                      <button
                        onClick={() => handleStatusChange(userDetail.user, 'active')}
                        className="flex-1 text-sm py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl font-medium"
                      >
                        Activate
                      </button>
                    )}
                    {userDetail.user.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(userDetail.user, 'suspended')}
                        className="flex-1 text-sm py-2 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-xl font-medium"
                      >
                        Suspend
                      </button>
                    )}
                    {userDetail.user.status !== 'banned' && (
                      <button
                        onClick={() => handleStatusChange(userDetail.user, 'banned')}
                        className="flex-1 text-sm py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl font-medium"
                      >
                        Ban
                      </button>
                    )}
                  </div>
                )}

                <button onClick={() => setSelected(null)} className="btn-secondary w-full">
                  Close
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Confirm status change dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h4 className="text-lg font-bold">Confirm Action</h4>
            <p className="text-sm text-gray-600">
              Are you sure you want to{' '}
              <span className="font-semibold capitalize">{confirmAction.status}</span>{' '}
              <span className="font-semibold">{confirmAction.name}</span>?
              {confirmAction.status === 'banned' && (
                <span className="block mt-1 text-red-600 text-xs">
                  This will permanently prevent the user from logging in.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => statusMutation.mutate({ id: confirmAction.id, status: confirmAction.status })}
                disabled={statusMutation.isLoading}
                className={`flex-1 py-2 text-sm rounded-xl font-medium text-white ${
                  confirmAction.status === 'banned' ? 'bg-red-500 hover:bg-red-600' :
                  confirmAction.status === 'suspended' ? 'bg-yellow-500 hover:bg-yellow-600' :
                  'bg-green-500 hover:bg-green-600'
                }`}
              >
                {statusMutation.isLoading ? 'Saving...' : `Yes, ${confirmAction.status}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
