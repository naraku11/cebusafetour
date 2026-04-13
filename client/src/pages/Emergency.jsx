import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdaptivePolling } from '../hooks/useAdaptivePolling';
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
  const [viewMode,        setViewMode]        = useState('tabs'); // 'tabs' | 'kanban' | 'archive'
  const [confirmArchive,  setConfirmArchive]  = useState(null);
  const [passwordLock,    setPasswordLock]    = useState(null);
  const adminEmail  = useAuthStore(s => s.user?.email);
  const isSuperAdmin = useAuthStore(s => s.user?.role) === 'admin_super';

  // Adaptive polling: starts at 15 s, backs off to 60 s when nothing changes,
  // resets immediately when new incident data arrives. Pauses when tab is hidden.
  const { refetchInterval, observe } = useAdaptivePolling({ base: 15_000, max: 60_000 });

  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ['incidents'],
    queryFn: () =>
      api.get('/emergency/incidents', { params: { limit: 200 } }).then(r => r.data),
    refetchInterval,
  });

  // Feed data back to the adaptive hook so it can detect changes
  useEffect(() => { if (data) observe(data); }, [data, observe]);

  const { data: archivedData, isLoading: archiveLoading, refetch: refetchArchive } = useQuery({
    queryKey: ['incidents-archived'],
    queryFn: () =>
      api.get('/emergency/incidents/archived', { params: { limit: 200 } }).then(r => r.data),
    enabled: viewMode === 'archive',
    staleTime: 0,
  });

  // Always re-fetch when the archive tab is opened so newly-archived rows appear immediately.
  // refetchOnMount does NOT fire on enabled:false→true transitions (only on true component mounts),
  // so we use an effect to guarantee a fresh fetch every time the user opens the archive view.
  useEffect(() => {
    if (viewMode === 'archive') refetchArchive();
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/emergency/incidents/${id}`, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident updated');
      setSelected(null);
    },
    onError: () => toast.error('Failed to update incident'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => api.patch(`/emergency/incidents/${id}/archive`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['incidents'] });
      await qc.invalidateQueries({ queryKey: ['incidents-archived'] });
      toast.success('Incident archived');
      setConfirmArchive(null);
      setSelected(null);
    },
    onError: () => toast.error('Failed to archive incident'),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id) => api.patch(`/emergency/incidents/${id}/unarchive`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['incidents'] });
      await qc.invalidateQueries({ queryKey: ['incidents-archived'] });
      toast.success('Incident restored to Resolved');
    },
    onError: () => toast.error('Failed to unarchive incident'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/emergency/incidents/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['incidents'] });
      await qc.invalidateQueries({ queryKey: ['incidents-archived'] });
      toast.success('Incident permanently deleted');
      setSelected(null);
    },
    onError: () => toast.error('Failed to delete incident'),
  });

  const requestArchive = (incident) => {
    if (incident.status === 'resolved') {
      setPasswordLock(incident);
    } else {
      setConfirmArchive(incident);
    }
  };

  const [typeFilter, setTypeFilter] = useState('');

  const allIncidents = data?.incidents || [];
  const filteredIncidents = typeFilter
    ? allIncidents.filter(i => i.type === typeFilter)
    : allIncidents;
  const counts = {
    new:         filteredIncidents.filter(i => i.status === 'new').length,
    in_progress: filteredIncidents.filter(i => i.status === 'in_progress').length,
    resolved:    filteredIncidents.filter(i => i.status === 'resolved').length,
  };
  const byStatus = tab => filteredIncidents.filter(i => i.status === tab);
  const activeTabCfg = TABS.find(t => t.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🚨 Emergency &amp; Incident Center</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Auto-refreshes adaptively (15s – 60s) · pauses when tab is hidden
            {dataUpdatedAt ? ` · Last updated ${formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type filter */}
          {viewMode !== 'archive' && (
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="input text-sm py-1.5 w-auto"
            >
              <option value="">All Types</option>
              <option value="medical">🏥 Medical</option>
              <option value="fire">🔥 Fire</option>
              <option value="crime">🚔 Crime</option>
              <option value="natural_disaster">🌊 Natural Disaster</option>
              <option value="lost_person">🆘 Lost Person</option>
            </select>
          )}
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {[
              { id: 'tabs',    label: 'Tabs',        superOnly: false },
              { id: 'kanban',  label: 'Kanban',      superOnly: false },
              { id: 'archive', label: '📦 Archive',  superOnly: true  },
            ].filter(v => !v.superOnly || isSuperAdmin).map(v => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`px-3 py-1.5 ${viewMode === v.id ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {v.label}
              </button>
            ))}
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

      {/* Stat summary cards — hidden in archive view */}
      {viewMode !== 'archive' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      )}

      {isLoading && viewMode !== 'archive' ? (
        <div className="card text-center py-16 text-gray-400">
          <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-3" />
          Loading incidents…
        </div>
      ) : viewMode === 'archive' ? (
        <ArchiveView
          incidents={archivedData?.incidents || []}
          loading={archiveLoading}
          onUnarchive={id => unarchiveMutation.mutate(id)}
          onRefresh={refetchArchive}
        />
      ) : viewMode === 'kanban' ? (
        <KanbanView
          byStatus={byStatus}
          tabs={TABS}
          onSelect={setSelected}
          onArchive={requestArchive}
          canArchive={isSuperAdmin}
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
          onArchive={requestArchive}
          canArchive={isSuperAdmin}
        />
      )}

      {selected && (
        <IncidentModal
          incident={selected}
          adminEmail={adminEmail}
          onClose={() => setSelected(null)}
          onSave={body => updateMutation.mutate({ id: selected.id, ...body })}
          onArchive={() => requestArchive(selected)}
          onDelete={() => deleteMutation.mutate(selected.id)}
          saving={updateMutation.isPending}
          canArchive={isSuperAdmin}
        />
      )}

      {passwordLock && (
        <PasswordUnlockModal
          incident={passwordLock}
          adminEmail={adminEmail}
          onCancel={() => setPasswordLock(null)}
          onUnlocked={() => { setConfirmArchive(passwordLock); setPasswordLock(null); }}
        />
      )}

      {confirmArchive && (
        <ArchiveConfirmModal
          incident={confirmArchive}
          onCancel={() => setConfirmArchive(null)}
          onConfirm={() => archiveMutation.mutate(confirmArchive.id)}
          archiving={archiveMutation.isPending}
        />
      )}
    </div>
  );
}

/* ── Tabs view ─────────────────────────────────────────────────────────────── */

function TabsView({ tabs, activeTab, onTabChange, counts, incidents, tabCfg, onSelect, onArchive, canArchive }) {
  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-4 overflow-x-auto">
        <nav className="flex gap-1 -mb-px min-w-max">
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
            <IncidentCard key={inc.id} incident={inc} tabCfg={tabCfg} canArchive={canArchive} onClick={() => onSelect(inc)} onArchive={e => { e.stopPropagation(); onArchive(inc); }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Kanban view ───────────────────────────────────────────────────────────── */

function KanbanView({ byStatus, tabs, onSelect, onArchive, canArchive }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
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
                <IncidentCard key={inc.id} incident={inc} tabCfg={tab} compact canArchive={canArchive} onClick={() => onSelect(inc)} onArchive={e => { e.stopPropagation(); onArchive(inc); }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Incident card ─────────────────────────────────────────────────────────── */

function IncidentCard({ incident: inc, tabCfg, compact = false, canArchive = false, onClick, onArchive }) {
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
          {canArchive && (
            <button
              onClick={onArchive}
              title={inc.status === 'resolved' ? 'Archive (requires password)' : 'Archive incident'}
              className="p-1 text-gray-300 hover:text-amber-500 transition-colors rounded"
            >
              {inc.status === 'resolved'
                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              }
            </button>
          )}
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

function IncidentModal({ incident: inc, adminEmail, onClose, onSave, onArchive, onDelete, saving, canArchive = false }) {
  const [status,            setStatus]            = useState(inc.status);
  const [assignedTo,        setAssignedTo]        = useState(inc.assignedTo || '');
  const [responderNotes,    setResponderNotes]    = useState(inc.responderNotes || '');
  const [editUnlocked,      setEditUnlocked]      = useState(false);
  const [showUnlock,        setShowUnlock]        = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isLocked = inc.status === 'resolved' && !editUnlocked;

  const statusColors = {
    new:         'bg-red-100 text-red-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    resolved:    'bg-green-100 text-green-700',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 max-h-[92dvh] overflow-y-auto overscroll-contain">
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
        <div className="pt-2 border-t border-gray-100 space-y-3">
          {/* Delete confirmation inline banner */}
          {showDeleteConfirm && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-sm text-red-700 flex-1">Permanently delete this incident? This cannot be undone.</p>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 shrink-0"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                Delete
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            {/* Left: destructive actions (super admin only) */}
            {canArchive ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onArchive}
                  className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors border border-amber-200"
                >
                  {inc.status === 'resolved'
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  }
                  {inc.status === 'resolved' ? 'Archive' : 'Archive'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={showDeleteConfirm}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-red-200 disabled:opacity-40"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            ) : <span />}

            {/* Right: save / cancel */}
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button
                onClick={() => onSave({ status, assignedTo, responderNotes })}
                disabled={saving || isLocked}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Update'}
              </button>
            </div>
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
            <p className="text-sm text-gray-500">Resolved incidents require a password to archive.</p>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Enter your admin password to unlock archiving of the{' '}
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
            {loading ? 'Verifying…' : 'Unlock & Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ArchiveConfirmModal({ incident: inc, onCancel, onConfirm, archiving }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Archive Incident</h3>
            <p className="text-sm text-gray-500">The incident will be moved to the archive.</p>
          </div>
        </div>
        <p className="text-sm text-gray-700">
          Archive the <span className="font-medium capitalize">{inc.type.replace('_', ' ')}</span> incident
          {inc.nearestLandmark ? <> at <span className="font-medium">{inc.nearestLandmark}</span></> : ''}?
          It can be restored later.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={archiving} className="btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={archiving}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {archiving ? 'Archiving…' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Archive view ──────────────────────────────────────────────────────────── */

function ArchiveView({ incidents, loading, onUnarchive, onRefresh }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-700">📦 Archived Incidents</h3>
          <p className="text-sm text-gray-400">{incidents.length} archived · restoring returns each incident to its original status</p>
        </div>
        <button onClick={onRefresh} className="btn-secondary text-sm py-1.5">Refresh</button>
      </div>

      {loading ? (
        <div className="card text-center py-16 text-gray-400">
          <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-3" />
          Loading archive…
        </div>
      ) : incidents.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-base">No archived incidents</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {incidents.map(inc => (
            <div key={inc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-gray-300 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">{TYPE_ICONS[inc.type] ?? '⚠️'}</span>
                  <div>
                    <p className="font-semibold capitalize">{inc.type.replace('_', ' ')}</p>
                    <p className="text-gray-400 text-xs">{inc.nearestLandmark || `${inc.latitude}, ${inc.longitude}`}</p>
                    {inc.reporter?.name && <p className="text-gray-400 text-xs">👤 {inc.reporter.name}</p>}
                  </div>
                </div>
                <button
                  onClick={() => onUnarchive(inc.id)}
                  title={`Restore to ${(inc.preArchiveStatus || 'resolved').replace('_', ' ')}`}
                  className="shrink-0 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 hover:bg-primary-50 px-2 py-1 rounded-lg transition-colors border border-primary-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Restore to {(inc.preArchiveStatus || 'resolved').replace('_', ' ')}
                </button>
              </div>
              {inc.description && (
                <p className="text-gray-500 text-sm mt-2 line-clamp-2">{inc.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Archived {formatDistanceToNow(new Date(inc.updatedAt), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      )}
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
