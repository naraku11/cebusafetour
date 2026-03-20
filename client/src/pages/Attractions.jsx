import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, ArchiveBoxIcon, ArchiveBoxXMarkIcon, SparklesIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';
import MapPicker from '../components/MapPicker';
import { useAuthStore } from '../store/authStore';

const SAFETY_COLORS = { safe: 'badge-safe', caution: 'badge-caution', restricted: 'badge-restricted' };
const CATEGORIES = ['beach', 'mountain', 'heritage', 'museum', 'park', 'waterfall', 'market', 'church', 'resort', 'other'];

const defaultForm = {
  name: '', category: 'beach', description: '', district: '', address: '',
  latitude: '', longitude: '', entranceFee: 0, safetyStatus: 'safe', status: 'published',
};

export default function Attractions() {
  const qc = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  const isSuperAdmin = currentUser?.role === 'admin_super';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ safetyStatus: '', status: 'published' });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSafetyTip, setAiSafetyTip] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name } | null

  const { data, isLoading } = useQuery({
    queryKey: ['attractions', filter, search],
    queryFn: () => api.get('/attractions', { params: { ...filter, search, limit: 50 } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body) => editing
      ? api.put(`/attractions/${editing.id}`, body)
      : api.post('/attractions', body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['attractions'] });
      toast.success(editing ? 'Attraction updated' : 'Attraction created');
      setShowModal(false); setEditing(null); setForm(defaultForm); setAiSafetyTip('');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => api.delete(`/attractions/${id}`),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['attractions'] }); toast.success('Attraction archived'); },
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id) => api.put(`/attractions/${id}`, { status: 'published' }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['attractions'] }); toast.success('Attraction restored to published'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/attractions/${id}/permanent`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['attractions'] });
      toast.success('Attraction permanently deleted');
      setDeleteConfirm(null);
    },
  });

  const refreshPhotosMutation = useMutation({
    mutationFn: (id) => api.post(`/attractions/${id}/refresh-photos`),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['attractions'] });
      toast.success(`Fetched ${res.data.count} photo${res.data.count !== 1 ? 's' : ''} from Google Places`);
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Failed to fetch photos';
      toast.error(msg);
    },
  });

  const openModal = (attraction = null) => {
    setEditing(attraction);
    setForm(attraction || defaultForm);
    setAiSafetyTip('');
    setShowModal(true);
  };

  const openEdit = (a) => openModal(a);

  const handleAiFill = async (lat, lng) => {
    const useLat = lat ?? form.latitude;
    const useLng = lng ?? form.longitude;
    if (!useLat || !useLng) { toast.error('Place a pin on the map first'); return; }
    setAiLoading(true);
    try {
      const { data: res } = await api.post('/attractions/ai-suggest', { latitude: useLat, longitude: useLng }, { skipToast: true, timeout: 120_000 });
      const s = res.suggestion;
      const sugLat = s.latitude  != null && s.latitude  !== '' ? parseFloat(s.latitude)  : null;
      const sugLng = s.longitude != null && s.longitude !== '' ? parseFloat(s.longitude) : null;
      setForm(f => ({
        ...f,
        name:        s.name        || f.name,
        category:    CATEGORIES.includes(s.category) ? s.category : f.category,
        district:    s.district    || f.district,
        address:     s.address     || f.address,
        description: s.description || f.description,
        entranceFee: s.entranceFee ?? f.entranceFee,
        latitude:    sugLat ?? f.latitude,
        longitude:   sugLng ?? f.longitude,
      }));
      if (s.safetyTips) setAiSafetyTip(s.safetyTips);
      toast.success('AI filled in all fields — review and adjust as needed');
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      const serverMsg = err?.response?.data?.error;
      const hint      = err?.response?.data?.hint;
      if (isTimeout) {
        toast.error('Request timed out — the model is too slow. Try phi3 or gemma.', { duration: 8000 });
      } else {
        toast.error(serverMsg || 'AI suggestion failed', { duration: 6000 });
        if (hint) toast(hint, { icon: '💡', duration: 8000 });
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attractions</h2>
          <p className="text-gray-500 text-sm">{data?.total ?? 0} total</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Attraction
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} className="input max-w-xs" placeholder="Search attractions..." />
        <select value={filter.safetyStatus} onChange={e => setFilter(f => ({ ...f, safetyStatus: e.target.value }))} className="input max-w-xs">
          <option value="">All Safety Status</option>
          <option value="safe">Safe</option>
          <option value="caution">Caution</option>
          <option value="restricted">Restricted</option>
        </select>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} className="input max-w-xs">
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">District</th>
                <th className="px-6 py-3 font-medium">Safety</th>
                <th className="px-6 py-3 font-medium">Visits</th>
                <th className="px-6 py-3 font-medium">Rating</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : !data?.attractions?.length ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No attractions found</td></tr>
              ) : data.attractions.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{a.name}</td>
                  <td className="px-6 py-4 capitalize text-gray-600">{a.category}</td>
                  <td className="px-6 py-4 text-gray-600">{a.district || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={SAFETY_COLORS[a.safetyStatus]}>{a.safetyStatus}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{a.totalVisits}</td>
                  <td className="px-6 py-4 text-gray-600">{a.averageRating ? `⭐ ${a.averageRating}` : '—'}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Edit">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => refreshPhotosMutation.mutate(a.id)}
                      disabled={refreshPhotosMutation.isPending && refreshPhotosMutation.variables === a.id}
                      className="p-1.5 hover:bg-sky-50 rounded-lg text-sky-600 disabled:opacity-40"
                      title="Refresh photos from Google Places"
                    >
                      <PhotoIcon className="w-4 h-4" />
                    </button>
                    {a.status === 'archived' ? (
                      <button onClick={() => unarchiveMutation.mutate(a.id)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600" title="Restore to published">
                        <ArchiveBoxXMarkIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => archiveMutation.mutate(a.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Archive">
                        <ArchiveBoxIcon className="w-4 h-4" />
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button onClick={() => setDeleteConfirm({ id: a.id, name: a.name })} className="p-1.5 hover:bg-red-100 rounded-lg text-red-700" title="Permanently delete">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <TrashIcon className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Permanently Delete</h3>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to permanently delete <strong>{deleteConfirm.name}</strong>?
              This action <span className="text-red-600 font-medium">cannot be undone</span>.
            </p>
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowModal(false); setEditing(null); setForm(defaultForm); setAiSafetyTip(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold">{editing ? 'Edit Attraction' : 'Add New Attraction'}</h3>

            {/* Attraction Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Attraction Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input w-full"
                placeholder="Filled by AI after placing pin, or type manually"
              />
            </div>

            {/* AI safety tip banner */}
            {aiSafetyTip && (
              <div className="flex gap-2 p-3 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-800">
                <SparklesIcon className="w-4 h-4 shrink-0 mt-0.5 text-violet-500" />
                <div><strong>AI Safety Tip:</strong> {aiSafetyTip}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">District</label>
                <input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} className="input" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input h-24 resize-none" />
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Location Pin</label>
                  <button
                    type="button"
                    onClick={() => handleAiFill()}
                    disabled={aiLoading || (!form.latitude && !form.longitude)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Suggest attraction details from the pinned location"
                  >
                    <SparklesIcon className={`w-3.5 h-3.5 ${aiLoading ? 'animate-pulse' : ''}`} />
                    {aiLoading ? 'Suggesting…' : 'Suggest from pin'}
                  </button>
                </div>
                <MapPicker
                  lat={form.latitude}
                  lng={form.longitude}
                  onChange={({ lat, lng }) => {
                    setForm(f => ({ ...f, latitude: lat, longitude: lng }));
                    handleAiFill(lat, lng);
                  }}
                />
                <p className="text-xs text-gray-400 mt-1">Click the map to place a pin — AI will automatically suggest the attraction details.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Safety Status</label>
                <select value={form.safetyStatus} onChange={e => setForm(f => ({ ...f, safetyStatus: e.target.value }))} className="input">
                  <option value="safe">🟢 Safe</option>
                  <option value="caution">🟡 Caution</option>
                  <option value="restricted">🔴 Restricted</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Entrance Fee (₱)</label>
                <input type="number" value={form.entranceFee} onChange={e => setForm(f => ({ ...f, entranceFee: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => { setShowModal(false); setAiSafetyTip(''); }} className="btn-secondary">Cancel</button>
              <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Attraction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
