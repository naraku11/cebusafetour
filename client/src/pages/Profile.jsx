import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  UserCircleIcon, CameraIcon, KeyIcon, PhoneIcon,
  GlobeAltIcon, ShieldCheckIcon, PencilSquareIcon,
  PlusIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

// ── Role display helpers ──────────────────────────────────────────────────────
const ROLE_BADGE = {
  admin_super:     { label: 'Super Admin',       className: 'bg-violet-100 text-violet-700' },
  admin_content:   { label: 'Content Manager',   className: 'bg-blue-100   text-blue-700'   },
  admin_emergency: { label: 'Emergency Officer', className: 'bg-red-100    text-red-700'    },
  tourist:         { label: 'Tourist',           className: 'bg-green-100  text-green-700'  },
};

const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  banned:    'bg-red-100   text-red-700',
};

const LANGUAGES = [
  { value: 'en',  label: 'English' },
  { value: 'fil', label: 'Filipino' },
  { value: 'zh',  label: 'Chinese' },
  { value: 'ko',  label: 'Korean' },
  { value: 'ja',  label: 'Japanese' },
];

// ── Section card wrapper ──────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-sky-600 shrink-0" />
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
    </div>
    {children}
  </div>
);

// ── Field row helper ──────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-500">{label}</label>
    {children}
  </div>
);

const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-50 disabled:text-gray-400';

// ── Main component ────────────────────────────────────────────────────────────
export default function Profile() {
  const qc = useQueryClient();
  const { user: storeUser, setUser } = useAuthStore();
  const fileRef = useRef(null);

  // Fetch fresh profile from server
  const { data, isLoading } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => api.get('/users/me').then(r => r.data.user ?? r.data),
    staleTime: 0,
  });
  const user = data ?? storeUser ?? {};

  // ── Info form state ────────────────────────────────────────────────────────
  const [info, setInfo] = useState(null);   // null = not yet edited (mirrors server data)
  const form = info ?? {
    name:        user.name ?? '',
    contactNumber: user.contactNumber ?? '',
    nationality: user.nationality ?? '',
    language:    user.language ?? 'en',
  };
  const setForm = (patch) => setInfo(prev => ({ ...(prev ?? form), ...patch }));

  // ── Password form state ────────────────────────────────────────────────────
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });

  // ── Emergency contacts state ───────────────────────────────────────────────
  const [contacts, setContacts] = useState(null);
  const emergencyContacts = contacts ?? (Array.isArray(user.emergencyContacts) ? user.emergencyContacts : []);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveInfo = useMutation({
    mutationFn: (body) => api.patch('/users/me', body),
    onSuccess: ({ data }) => {
      const updated = data.user ?? data;
      setUser(updated);
      qc.setQueryData(['profile-me'], updated);
      setInfo(null);
      toast.success('Profile updated');
    },
  });

  const savePassword = useMutation({
    mutationFn: (body) => api.patch('/users/me/password', body),
    onSuccess: () => {
      setPwd({ current: '', next: '', confirm: '' });
      toast.success('Password changed');
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('avatar', file);
      return api.post('/users/me/profile-picture', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: ({ data }) => {
      const updated = data.user ?? data;
      setUser(updated);
      qc.setQueryData(['profile-me'], updated);
      toast.success('Avatar updated');
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleInfoSubmit = (e) => {
    e.preventDefault();
    const payload = { name: form.name, contactNumber: form.contactNumber };
    if (user.role === 'tourist') {
      payload.nationality = form.nationality;
      payload.language    = form.language;
    }
    if (contacts !== null) payload.emergencyContacts = emergencyContacts;
    saveInfo.mutate(payload);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (pwd.next !== pwd.confirm)
      return toast.error('New passwords do not match');
    if (pwd.next.length < 8)
      return toast.error('Password must be at least 8 characters');
    savePassword.mutate({ currentPassword: pwd.current, newPassword: pwd.next });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar.mutate(file);
    e.target.value = '';
  };

  const addContact = () =>
    setContacts([...emergencyContacts, { name: '', phone: '', relation: '' }]);

  const updateContact = (i, patch) =>
    setContacts(emergencyContacts.map((c, idx) => idx === i ? { ...c, ...patch } : c));

  const removeContact = (i) =>
    setContacts(emergencyContacts.filter((_, idx) => idx !== i));

  // ── Role & status badges ───────────────────────────────────────────────────
  const roleBadge   = ROLE_BADGE[user.role]   ?? { label: user.role ?? '—',      className: 'bg-gray-100 text-gray-600' };
  const statusBadge = STATUS_BADGE[user.status] ?? 'bg-gray-100 text-gray-600';

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">

      {/* ── Avatar + identity ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6 flex items-center gap-5">
        {/* Avatar */}
        <div className="relative shrink-0">
          {user.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <UserCircleIcon className="w-20 h-20 text-gray-300" />
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadAvatar.isPending}
            className="absolute bottom-0 right-0 bg-sky-600 hover:bg-sky-700 text-white rounded-full p-1.5 shadow transition-colors disabled:opacity-50"
            title="Change photo"
          >
            <CameraIcon className="w-3.5 h-3.5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        {/* Name + badges */}
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-900 truncate">{user.name}</p>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge.className}`}>
              {roleBadge.label}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge}`}>
              {user.status}
            </span>
            {user.isVerified && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700 flex items-center gap-1">
                <ShieldCheckIcon className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
          {user.lastActive && (
            <p className="text-xs text-gray-400 mt-1">
              Last active: {new Date(user.lastActive).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* ── Personal info ─────────────────────────────────────────────────── */}
      <Section title="Personal Information" icon={PencilSquareIcon}>
        <form onSubmit={handleInfoSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name *">
              <input
                className={inputCls}
                value={form.name}
                onChange={e => setForm({ name: e.target.value })}
                required
              />
            </Field>
            <Field label="Email">
              <input className={inputCls} value={user.email ?? ''} disabled />
            </Field>
            <Field label="Contact Number">
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className={`${inputCls} pl-9`}
                  value={form.contactNumber}
                  onChange={e => setForm({ contactNumber: e.target.value })}
                  placeholder="+63 9XX XXX XXXX"
                />
              </div>
            </Field>

            {/* Tourist-only fields */}
            {user.role === 'tourist' && (
              <>
                <Field label="Nationality">
                  <div className="relative">
                    <GlobeAltIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      className={`${inputCls} pl-9`}
                      value={form.nationality}
                      onChange={e => setForm({ nationality: e.target.value })}
                      placeholder="e.g. Korean"
                    />
                  </div>
                </Field>
                <Field label="Preferred Language">
                  <select
                    className={inputCls}
                    value={form.language}
                    onChange={e => setForm({ language: e.target.value })}
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </Field>
              </>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saveInfo.isPending}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saveInfo.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Change password ───────────────────────────────────────────────── */}
      <Section title="Change Password" icon={KeyIcon}>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Current Password">
              <input
                type="password"
                className={inputCls}
                value={pwd.current}
                onChange={e => setPwd(p => ({ ...p, current: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </Field>
            <Field label="New Password">
              <input
                type="password"
                className={inputCls}
                value={pwd.next}
                onChange={e => setPwd(p => ({ ...p, next: e.target.value }))}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </Field>
            <Field label="Confirm New Password">
              <input
                type="password"
                className={inputCls}
                value={pwd.confirm}
                onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
                required
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savePassword.isPending}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {savePassword.isPending ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Emergency contacts (tourist only) ────────────────────────────── */}
      {user.role === 'tourist' && (
        <Section title="Emergency Contacts" icon={PhoneIcon}>
          <div className="space-y-3">
            {emergencyContacts.map((c, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-end">
                <Field label="Name">
                  <input
                    className={inputCls}
                    value={c.name}
                    onChange={e => updateContact(i, { name: e.target.value })}
                    placeholder="Full name"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className={inputCls}
                    value={c.phone}
                    onChange={e => updateContact(i, { phone: e.target.value })}
                    placeholder="+63 9XX…"
                  />
                </Field>
                <div className="flex items-end gap-2">
                  <Field label="Relation">
                    <input
                      className={inputCls}
                      value={c.relation}
                      onChange={e => updateContact(i, { relation: e.target.value })}
                      placeholder="e.g. Spouse"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => removeContact(i)}
                    className="mb-0.5 p-2 text-red-400 hover:text-red-600 transition-colors shrink-0"
                    title="Remove"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={addContact}
                className="flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium"
              >
                <PlusIcon className="w-4 h-4" /> Add Contact
              </button>
              {contacts !== null && (
                <button
                  type="button"
                  disabled={saveInfo.isPending}
                  onClick={() => saveInfo.mutate({ emergencyContacts })}
                  className="ml-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saveInfo.isPending ? 'Saving…' : 'Save Contacts'}
                </button>
              )}
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
