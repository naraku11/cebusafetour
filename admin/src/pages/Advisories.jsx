import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { PlusIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const SEVERITY_MAP = { critical: 'badge-critical', warning: 'badge-warning', advisory: 'badge-advisory' };
const SEVERITY_ICONS = { critical: '🔴', warning: '🟡', advisory: '🟢' };

const defaultForm = {
  title: '', description: '', severity: 'advisory', source: 'admin',
  startDate: '', endDate: '', recommendedActions: '',
};

export default function Advisories() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [aiArea, setAiArea] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['advisories', statusFilter],
    queryFn: () => api.get('/advisories', { params: { status: statusFilter, limit: 50 } }).then(r => r.data),
  });

  const { data: attractionsData } = useQuery({
    queryKey: ['attractions-list'],
    queryFn: () => api.get('/attractions', { params: { status: 'published', limit: 200 } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const buildPayload = (f) => ({
    title: f.title,
    description: f.description,
    severity: f.severity,
    source: f.source,
    recommendedActions: f.recommendedActions || undefined,
    startDate: f.startDate,
    endDate: f.endDate || undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (body) => editing
      ? api.put(`/advisories/${editing.id}`, buildPayload(body))
      : api.post('/advisories', buildPayload(body)),
    onSuccess: () => {
      qc.invalidateQueries(['advisories']);
      toast.success(editing ? 'Advisory updated' : 'Advisory published & notification sent');
      setShowModal(false); setEditing(null); setForm(defaultForm);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id) => api.patch(`/advisories/${id}/resolve`),
    onSuccess: () => { qc.invalidateQueries(['advisories']); toast.success('Advisory resolved'); },
  });

  const openEdit = (a) => {
    setEditing(a);
    setForm({ ...a, startDate: a.startDate?.split('T')[0] || '', endDate: a.endDate?.split('T')[0] || '' });
    setAiArea('');
    setShowModal(true);
  };

  const handleAiFill = async () => {
    if (!aiArea.trim()) { toast.error('Enter an attraction or area name first'); return; }
    setAiLoading(true);
    try {
      const { data: res } = await api.post('/advisories/ai-suggest', { area: aiArea }, { skipToast: true });
      const s = res.suggestion;
      setForm(f => ({
        ...f,
        title:              s.title              || f.title,
        description:        s.description        || f.description,
        severity:           ['critical','warning','advisory'].includes(s.severity) ? s.severity : f.severity,
        recommendedActions: s.recommendedActions || f.recommendedActions,
      }));
      toast.success('AI filled in the advisory — review and adjust before publishing');
    } catch (err) {
      const serverMsg = err?.response?.data?.error;
      const hint      = err?.response?.data?.hint;
      toast.error(serverMsg || 'AI suggestion failed', { duration: 6000 });
      if (hint) toast(hint, { icon: '💡', duration: 8000 });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Safety Advisories</h2>
          <p className="text-gray-500 text-sm">{data?.total ?? 0} advisories</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(defaultForm); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Create Advisory
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['active', 'resolved', 'archived'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Advisory Cards */}
      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-4">
          {data?.advisories?.map(advisory => (
            <div key={advisory.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{SEVERITY_ICONS[advisory.severity]}</span>
                    <h3 className="font-semibold text-gray-900">{advisory.title}</h3>
                    <span className={SEVERITY_MAP[advisory.severity]}>{advisory.severity}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{advisory.description}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Source: <strong>{advisory.source?.toUpperCase()}</strong></span>
                    <span>From: <strong>{format(new Date(advisory.startDate), 'MMM d, yyyy')}</strong></span>
                    {advisory.endDate && <span>Until: <strong>{format(new Date(advisory.endDate), 'MMM d, yyyy')}</strong></span>}
                    <span>Acknowledged: <strong>{advisory.acknowledgedBy?.length ?? 0} users</strong></span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(advisory)} className="btn-secondary text-xs py-1.5">Edit</button>
                  {advisory.status === 'active' && (
                    <button onClick={() => resolveMutation.mutate(advisory.id)} className="flex items-center gap-1 text-xs py-1.5 px-3 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100">
                      <CheckCircleIcon className="w-4 h-4" /> Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!data?.advisories?.length && (
            <div className="card text-center py-12 text-gray-400">No advisories found</div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowModal(false); setEditing(null); setForm(defaultForm); setAiArea(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold">{editing ? 'Edit Advisory' : 'Create Advisory'}</h3>

            {/* AI generation — only for new advisories */}
            {!editing && (
              <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl space-y-2">
                <p className="text-xs font-medium text-violet-700">Generate with AI — select an attraction area</p>
                <div className="flex gap-2">
                  <select
                    value={aiArea}
                    onChange={e => setAiArea(e.target.value)}
                    className="input flex-1 text-sm"
                  >
                    <option value="">— Select an attraction —</option>
                    {(attractionsData?.attractions ?? [])
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(a => (
                        <option key={a.id} value={a.name}>
                          {a.name}{a.district ? ` · ${a.district}` : ''}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleAiFill}
                    disabled={aiLoading || !aiArea.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    <SparklesIcon className={`w-4 h-4 ${aiLoading ? 'animate-pulse' : ''}`} />
                    {aiLoading ? 'Generating…' : 'Generate'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Severity</label>
                  <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} className="input">
                    <option value="critical">🔴 Critical</option>
                    <option value="warning">🟡 Warning</option>
                    <option value="advisory">🟢 Advisory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Source</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="input">
                    <option value="pagasa">PAGASA</option>
                    <option value="ndrrmc">NDRRMC</option>
                    <option value="lgu">LGU</option>
                    <option value="cdrrmo">CDRRMO</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date (optional)</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input h-24 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Recommended Actions</label>
                <textarea value={form.recommendedActions} onChange={e => setForm(f => ({ ...f, recommendedActions: e.target.value }))} className="input h-20 resize-none" placeholder="Evacuation instructions, what to do..." />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="btn-primary">
                {saveMutation.isPending ? 'Saving...' : editing ? 'Update Advisory' : 'Publish & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
