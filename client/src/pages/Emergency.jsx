import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuthStore } from '../store/authStore';

const TYPE_ICONS = {
  medical: '🏥', fire: '🔥', crime: '🚔',
  natural_disaster: '🌊', lost_person: '🆘',
};

const TABS = [
  {
    id: 'new',
    label: 'New',
    icon: '🆕',
    textColor:   'text-red-600',
    badgeBg:     'bg-red-100 text-red-700',
    activeTab:   'border-red-500 text-red-600',
    inactiveTab: 'border-transparent text-gray-500 hover:text-red-500 hover:border-red-300',
    cardBorder:  'border-l-4 border-l-red-400',
    headerBg:    'bg-red-50',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    icon: '⚡',
    textColor:   'text-yellow-600',
    badgeBg:     'bg-yellow-100 text-yellow-700',
    activeTab:   'border-yellow-500 text-yellow-600',
    inactiveTab: 'border-transparent text-gray-500 hover:text-yellow-500 hover:border-yellow-300',
    cardBorder:  'border-l-4 border-l-yellow-400',
    headerBg:    'bg-yellow-50',
  },
  {
    id: 'resolved',
    label: 'Resolved',
    icon: '✅',
    textColor:   'text-green-600',
    badgeBg:     'bg-green-100 text-green-700',
    activeTab:   'border-green-500 text-green-600',
    inactiveTab: 'border-transparent text-gray-500 hover:text-green-500 hover:border-green-300',
    cardBorder:  'border-l-4 border-l-green-400',
    headerBg:    'bg-green-50',
  },
];

const STAT_STYLES = {
  new:         { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    num: 'text-red-600'    },
  in_progress: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', num: 'text-yellow-600' },
  resolved:    { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  num: 'text-green-600'  },
};

export default function Emergency() {
  const qc = useQueryClient();
  const [activeTab,       setActiveTab]       = useState('new');
  const [selected,        setSelected]        = useState(null);
  const [viewMode,        setViewMode]        = useState('tabs'); // 'tabs' | 'kanban'
  const [confirmDelete,   setConfirmDelete]   = useState(null); // incident to delete
  const [passwordLock,    setPasswordLock]    = useState(null); // resolved incident awaiting password
  const adminEmail = useAuthStore(s => s.user?.email);

  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ['incidents'],
    queryFn: () =>
      api.get('/emergency/incidents', { params: { limit: 200 } }).then(r => r.data),
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/emergency/incidents/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries(['incidents']);
      toast.success('Incident updated');
      setSelected(null);
    },
    onError: () => toast.error('Failed to update incident'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/emergency/incidents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['incidents']);
      toast.success('Incident deleted');
      setConfirmDelete(null);
      setSelected(null);
    },
    onError: () => toast.error('Failed to delete incident'),
  });

  const requestDelete = (incident) => {
    if (incident.status === 'resolved') {
      setPasswordLock(incident);
    } else {
      setConfirmDelete(incident);
    }
  };

  const allIncidents = data?.incidents || [];
  const counts = {
    new:         allIncidents.filter(i => i.status === 'new').length,
    in_progress: allIncidents.filter(i => i.status === 'in_progress').length,
    resolved:    allIncidents.filter(i => i.status === 'resolved').length,
  };
  const byStatus = tab => allIncidents.filter(i => i.status === tab);
  const activeTabCfg = TABS.find(t => t.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🚨 Emergency &amp; Incident Center</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Auto-refreshes every 30s
            {dataUpdatedAt ? ` · Last updated ${formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button
              onClick={() => setViewMode('tabs')}
              className={`px-3 py-1.5 ${viewMode === 'tabs' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Tabs
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 ${viewMode === 'kanban' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Kanban
            </button>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary flex items-center gap-1 text-sm py-1.5"
          >
            <svg className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Stat summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {TABS.map(tab => {
          const s = STAT_STYLES[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setViewMode('tabs'); }}
              className={`card text-left border-2 transition-all ${
                activeTab === tab.id && viewMode === 'tabs'
                  ? `${s.border} ${s.bg}`
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              <p className={`text-3xl font-bold ${s.num}`}>{counts[tab.id]}</p>
              <p className={`text-sm font-medium mt-1 ${s.text}`}>
                {tab.icon} {tab.label}
              </p>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="card text-center py-16 text-gray-400">
          <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-3" />
          Loading incidents…
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanView
          byStatus={byStatus}
          tabs={TABS}
          onSelect={setSelected}
          onDelete={requestDelete}
        />
      ) : (
        <TabsView
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={counts}
          incidents={byStatus(activeTab)}
          tabCfg={activeTabCfg}
          onSelect={setSelected}
          onDelete={requestDelete}
        />
      )}

      {selected && (
        <IncidentModal
          incident={selected}
          adminEmail={adminEmail}
          onClose={() => setSelected(null)}
          onSave={body => updateMutation.mutate({ id: selected.id, ...body })}
          onDelete={() => requestDelete(selected)}
          saving={updateMutation.isPending}
        />
      )}

      {passwordLock && (
        <PasswordUnlockModal
          incident={passwordLock}
          adminEmail={adminEmail}
          onCancel={() => setPasswordLock(null)}
          onUnlocked={() => { setConfirmDelete(passwordLock); setPasswordLock(null); }}
        />
      )}

      {confirmDelete && (
        <DeleteConfirmModal
          incident={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
          deleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

/* ── Tabs view ─────────────────────────────────────────────────────────────── */

function TabsView({ tabs, activeTab, onTabChange, counts, incidents, tabCfg, onSelect, onDelete }) {
  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-1 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? tab.activeTab : tab.inactiveTab
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${tab.badgeBg}`}>
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Incident grid */}
      {incidents.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">{tabCfg?.icon}</p>
          <p className="text-base">No {tabCfg?.label.toLowerCase()} incidents</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {incidents.map(inc => (
            <IncidentCard key={inc.id} incident={inc} tabCfg={tabCfg} onClick={() => onSelect(inc)} onDelete={e => { e.stopPropagation(); onDelete(inc); }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Kanban view ───────────────────────────────────────────────────────────── */

function KanbanView({ byStatus, tabs, onSelect, onDelete }) {
  return (
    <div className="grid lg:grid-cols-3 gap-4 items-start">
      {tabs.map(tab => {
        const incidents = byStatus(tab.id);
        return (
          <div key={tab.id} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            {/* Column header */}
            <div className={`px-4 py-3 ${tab.headerBg} border-b border-gray-200 flex items-center justify-between`}>
              <span className={`font-semibold text-sm ${tab.textColor} flex items-center gap-2`}>
                {tab.icon} {tab.label}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tab.badgeBg}`}>
                {incidents.length}
              </span>
            </div>
            {/* Cards */}
            <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
              {incidents.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No incidents</p>
              ) : incidents.map(inc => (
                <IncidentCard key={inc.id} incident={inc} tabCfg={tab} compact onClick={() => onSelect(inc)} onDelete={e => { e.stopPropagation(); onDelete(inc); }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Incident card ─────────────────────────────────────────────────────────── */

function IncidentCard({ incident: inc, tabCfg, compact = false, onClick, onDelete }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow ${tabCfg?.cardBorder} ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={compact ? 'text-2xl' : 'text-3xl'}>{TYPE_ICONS[inc.type] ?? '⚠️'}</span>
          <div>
            <p className={`font-semibold capitalize ${compact ? 'text-sm' : ''}`}>
              {inc.type.replace('_', ' ')}
            </p>
            <p className="text-gray-400 text-xs truncate max-w-[160px]">
              {inc.nearestLandmark || `${inc.latitude}, ${inc.longitude}`}
            </p>
            {inc.reporter?.name && (
              <p className="text-gray-400 text-xs truncate max-w-[160px]">👤 {inc.reporter.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!compact && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tabCfg?.badgeBg}`}>
              {tabCfg?.label}
            </span>
          )}
          <button
            onClick={onDelete}
            title={inc.status === 'resolved' ? 'Locked — requires admin password' : 'Delete incident'}
            className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
          >
            {inc.status === 'resolved'
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            }
          </button>
        </div>
      </div>

      {!compact && inc.description && (
        <p className="text-gray-500 text-sm mt-2 line-clamp-2">{inc.description}</p>
      )}

      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
        <span>{formatDistanceToNow(new Date(inc.createdAt), { addSuffix: true })}</span>
        {inc.assignedTo && (
          <span className="bg-gray-100 px-2 py-0.5 rounded-full truncate max-w-[120px]">
            👤 {inc.assignedTo}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Incident modal ────────────────────────────────────────────────────────── */

function IncidentModal({ incident: inc, adminEmail, onClose, onSave, onDelete, saving }) {
  const [status,         setStatus]         = useState(inc.status);
  const [assignedTo,     setAssignedTo]     = useState(inc.assignedTo || '');
  const [responderNotes, setResponderNotes] = useState(inc.responderNotes || '');
  const [editUnlocked,   setEditUnlocked]   = useState(false);
  const [showUnlock,     setShowUnlock]     = useState(false);

  const isLocked = inc.status === 'resolved' && !editUnlocked;

  const statusColors = {
    new:         'bg-red-100 text-red-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    resolved:    'bg-green-100 text-green-700',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-4xl">{TYPE_ICONS[inc.type] ?? '⚠️'}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold capitalize">{inc.type.replace('_', ' ')}</h3>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inc.status]}`}>
              Current: {inc.status.replace('_', ' ')}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Map */}
        {inc.latitude && inc.longitude && (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <iframe
              title="Incident location"
              width="100%"
              height="200"
              loading="lazy"
              src={`https://maps.google.com/maps?q=${inc.latitude},${inc.longitude}&z=16&output=embed`}
            />
            <a
              href={`https://www.google.com/maps?q=${inc.latitude},${inc.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 py-1.5 bg-gray-50 border-t border-gray-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in Google Maps
            </a>
          </div>
        )}

        {/* Details */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <Row label="Location"    value={inc.nearestLandmark || '—'} />
          <Row label="Coordinates" value={`${inc.latitude}, ${inc.longitude}`} />
          <Row label="Description" value={inc.description || '—'} />
          <Row label="Reporter"    value={[inc.reporter?.name, inc.reporterContact].filter(Boolean).join(' · ') || '—'} />
          <Row label="Reported"    value={format(new Date(inc.createdAt), 'MMM d, yyyy · h:mm a')} />
          {inc.resolvedAt && (
            <Row label="Resolved" value={format(new Date(inc.resolvedAt), 'MMM d, yyyy · h:mm a')} />
          )}
        </div>

        {/* Update form */}
        <div className="space-y-3 border-t pt-4">
          {/* Lock banner for resolved incidents */}
          {isLocked && (
            <div className="flex items-center justify-between gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-yellow-700 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Editing locked — this incident is resolved.</span>
              </div>
              <button
                onClick={() => setShowUnlock(true)}
                className="shrink-0 text-xs font-medium text-yellow-700 hover:text-yellow-900 underline underline-offset-2"
              >
                Unlock to Edit
              </button>
            </div>
          )}

          <div className={isLocked ? 'opacity-40 pointer-events-none select-none' : ''}>
            <label className="block text-sm font-medium mb-1">Update Status</label>
            <div className="flex gap-2">
              {[
                { val: 'new',         label: 'New',         active: 'bg-red-500    border-red-500    text-white', inactive: 'border-red-300    text-red-600    hover:bg-red-50'    },
                { val: 'in_progress', label: 'In Progress', active: 'bg-yellow-500 border-yellow-500 text-white', inactive: 'border-yellow-300 text-yellow-600 hover:bg-yellow-50' },
                { val: 'resolved',    label: 'Resolved',    active: 'bg-green-500  border-green-500  text-white', inactive: 'border-green-300  text-green-600  hover:bg-green-50'  },
              ].map(s => (
                <button
                  key={s.val}
                  onClick={() => setStatus(s.val)}
                  className={`flex-1 py-2 text-sm font-medium border-2 rounded-lg transition-colors ${status === s.val ? s.active : s.inactive}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className={isLocked ? 'opacity-40 pointer-events-none select-none' : ''}>
            <label className="block text-sm font-medium mb-1">Assign Responder / Agency</label>
            <input
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className="input"
              placeholder="e.g. PNP Lahug, Cebu City Fire Station"
            />
          </div>

          <div className={isLocked ? 'opacity-40 pointer-events-none select-none' : ''}>
            <label className="block text-sm font-medium mb-1">Responder Notes</label>
            <textarea
              value={responderNotes}
              onChange={e => setResponderNotes(e.target.value)}
              className="input h-20 resize-none"
              placeholder="Add notes about the response…"
            />
          </div>
        </div>

        {/* Password unlock sheet (inline inside modal) */}
        {showUnlock && (
          <PasswordUnlockModal
            incident={inc}
            adminEmail={adminEmail}
            onCancel={() => setShowUnlock(false)}
            onUnlocked={() => { setEditUnlocked(true); setShowUnlock(false); }}
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            {inc.status === 'resolved'
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            }
            {inc.status === 'resolved' ? 'Delete (Locked)' : 'Delete'}
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={() => onSave({ status, assignedTo, responderNotes })}
              disabled={saving || isLocked}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Update Incident'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordUnlockModal({ incident: inc, adminEmail, onCancel, onUnlocked }) {
  const [password, setPassword] = useState('');
  const [show,     setShow]     = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleVerify = async () => {
    if (!password) { setError('Password is required'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/login', { email: adminEmail, password });
      onUnlocked();
    } catch {
      setError('Incorrect password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Admin Verification Required</h3>
            <p className="text-sm text-gray-500">This incident is resolved and locked.</p>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Enter your admin password to unlock deletion of the{' '}
          <span className="font-medium capitalize">{inc.type.replace('_', ' ')}</span> incident.
        </p>

        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            placeholder="Enter your password"
            autoFocus
            className={`input pr-10 ${error ? 'border-red-400 focus:ring-red-300' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {show
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            }
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={loading} className="btn-secondary">Cancel</button>
          <button
            onClick={handleVerify}
            disabled={loading || !password}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Unlock & Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ incident: inc, onCancel, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Delete Incident</h3>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-gray-700">
          Are you sure you want to delete the <span className="font-medium capitalize">{inc.type.replace('_', ' ')}</span> incident
          {inc.nearestLandmark ? <> at <span className="font-medium">{inc.nearestLandmark}</span></> : ''}?
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={deleting} className="btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 shrink-0 w-28">{label}:</span>
      <span className="text-gray-800 break-words">{value}</span>
    </div>
  );
}
