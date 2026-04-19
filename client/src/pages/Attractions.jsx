import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, ArchiveBoxIcon, ArchiveBoxXMarkIcon, SparklesIcon, TrashIcon, PhotoIcon, MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import MapPicker from '../components/MapPicker';
import { useAuthStore } from '../store/authStore';
import { useMeta } from '../hooks/useMeta';

const SAFETY_COLORS = { safe: 'badge-safe', caution: 'badge-caution', restricted: 'badge-restricted' };
// Fallback used only before meta loads or in sub-components outside the provider
const DEFAULT_CATEGORIES = ['beach', 'mountain', 'heritage', 'museum', 'park', 'waterfall', 'market', 'church', 'resort', 'other'];

const defaultForm = {
  name: '', category: 'beach', description: '', district: '', address: '',
  latitude: '', longitude: '', entranceFee: 0, safetyStatus: 'safe', status: 'published',
};

function AttractionMobileRow({ a, isSuperAdmin, onEdit, onArchive, onUnarchive, onRefreshPhotos, onDelete, refreshingId }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-2xl shrink-0">
          {{ beach: '🏖️', mountain: '⛰️', heritage: '🏛️', museum: '🏛️', park: '🌳', waterfall: '💧', market: '🛒', church: '⛪', resort: '🏨', other: '📍' }[a.category] ?? '📍'}
        </span>
        <span className="flex-1 font-medium text-sm leading-snug break-words min-w-0">{a.name}</span>
        <span className={`shrink-0 ${SAFETY_COLORS[a.safetyStatus]}`}>{a.safetyStatus}</span>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-3">
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Category</dt>
              <dd className="capitalize text-gray-700">{a.category}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">District</dt>
              <dd className="text-gray-700">{a.district || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Rating</dt>
              <dd className="text-gray-700">{a.averageRating ? `⭐ ${a.averageRating}` : '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Visits</dt>
              <dd className="text-gray-700">{a.totalVisits ?? 0}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onEdit(a)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg">
              <PencilIcon className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => onRefreshPhotos(a.id)}
              disabled={refreshingId === a.id}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg disabled:opacity-40">
              <PhotoIcon className="w-3.5 h-3.5" /> Photos
            </button>
            {a.status === 'archived' ? (
              <button onClick={() => onUnarchive(a.id)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg">
                <ArchiveBoxXMarkIcon className="w-3.5 h-3.5" /> Restore
              </button>
            ) : (
              <button onClick={() => onArchive(a.id)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg">
                <ArchiveBoxIcon className="w-3.5 h-3.5" /> Archive
              </button>
            )}
            {isSuperAdmin && (
              <button onClick={() => onDelete({ id: a.id, name: a.name })}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg">
                <TrashIcon className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Attractions() {
  const qc = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  const isSuperAdmin = currentUser?.role === 'admin_super';
  const { attraction: attractionMeta } = useMeta();
  const categories = attractionMeta?.categories ?? DEFAULT_CATEGORIES;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState({ safetyStatus: '', status: 'published' });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSafetyTip, setAiSafetyTip] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [acInput, setAcInput] = useState('');
  const [acResults, setAcResults] = useState([]);
  const [acLoading, setAcLoading] = useState(false);
  const [acOpen, setAcOpen] = useState(false);
  const [acFilling, setAcFilling] = useState(false);
  const acDebounce = useRef(null);
  const acRef = useRef(null);
  const searchTimer = useRef(null);

  // Debounce search input
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['attractions', filter, debouncedSearch],
    queryFn: () => api.get('/attractions', { params: { ...filter, search: debouncedSearch, limit: 500 } }).then(r => r.data),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: (body) => editing
      ? api.put(`/attractions/${editing.id}`, body)
      : api.post('/attractions', body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['attractions'] });
      toast.success(editing ? 'Attraction updated' : 'Attraction created');
      closeModal();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => api.delete(`/attractions/${id}`),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['attractions'] }); toast.success('Attraction archived'); },
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id) => api.put(`/attractions/${id}`, { status: 'published' }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['attractions'] }); toast.success('Attraction restored'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/attractions/${id}/permanent`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['attractions'] });
      toast.success('Permanently deleted');
      setDeleteConfirm(null);
    },
  });

  const refreshPhotosMutation = useMutation({
    mutationFn: (id) => api.post(`/attractions/${id}/refresh-photos`),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['attractions'] });
      toast.success(`Fetched ${res.data.count} photo${res.data.count !== 1 ? 's' : ''}`);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to fetch photos'),
  });

  const closeModal = () => {
    setShowModal(false); setEditing(null); setForm(defaultForm); setAiSafetyTip('');
    setAcInput(''); setAcResults([]); setAcOpen(false);
  };

  const openModal = (attraction = null) => {
    setEditing(attraction);
    setForm(attraction || defaultForm);
    setAiSafetyTip('');
    setAcInput(''); setAcResults([]); setAcOpen(false);
    setShowModal(true);
  };

  // Clear autocomplete debounce timer on unmount
  useEffect(() => () => clearTimeout(acDebounce.current), []);

  // Close autocomplete on outside click
  useEffect(() => {
    const handler = (e) => { if (acRef.current && !acRef.current.contains(e.target)) setAcOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchAutocomplete = useCallback((value) => {
    clearTimeout(acDebounce.current);
    if (!value.trim()) { setAcResults([]); setAcOpen(false); return; }
    acDebounce.current = setTimeout(async () => {
      setAcLoading(true);
      try {
        const params = { input: value };
        if (form.latitude) params.lat = form.latitude;
        if (form.longitude) params.lng = form.longitude;
        const { data: res } = await api.get('/attractions/autocomplete', { params, skipToast: true });
        setAcResults(res.predictions || []);
        setAcOpen((res.predictions || []).length > 0);
      } catch { setAcResults([]); }
      finally { setAcLoading(false); }
    }, 300);
  }, [form.latitude, form.longitude]);

  const handleAcInput = (e) => {
    const v = e.target.value;
    setAcInput(v);
    fetchAutocomplete(v);
  };

  const selectPlace = async (prediction) => {
    setAcOpen(false);
    setAcInput(prediction.mainText);
    setAcFilling(true);
    try {
      const { data: res } = await api.get('/attractions/place-detail', { params: { placeId: prediction.placeId }, skipToast: true });
      const info = res.info;
      setForm(f => ({
        ...f,
        name:        info.name        || f.name,
        category:    categories.includes(info.category) ? info.category : f.category,
        district:    info.district    || f.district,
        address:     info.address     || f.address,
        description: info.description || f.description,
        entranceFee: info.entranceFee ?? f.entranceFee,
        latitude:    info.latitude    ?? f.latitude,
        longitude:   info.longitude   ?? f.longitude,
      }));
      toast.success('Fields filled from Google Places');
    } catch {
      toast.error('Could not fetch place details');
    } finally { setAcFilling(false); }
  };

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
        category:    categories.includes(s.category) ? s.category : f.category,
        district:    s.district    || f.district,
        address:     s.address     || f.address,
        description: s.description || f.description,
        entranceFee: s.entranceFee ?? f.entranceFee,
        latitude:    sugLat ?? f.latitude,
        longitude:   sugLng ?? f.longitude,
      }));
      if (s.safetyTips) setAiSafetyTip(s.safetyTips);
      toast.success('AI filled in all fields');
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      const serverMsg = err?.response?.data?.error;
      const hint      = err?.response?.data?.hint;
      if (isTimeout) toast.error('Request timed out — try again.', { duration: 8000 });
      else {
        toast.error(serverMsg || 'AI suggestion failed', { duration: 6000 });
        if (hint) toast(hint, { icon: '💡', duration: 8000 });
      }
    } finally { setAiLoading(false); }
  };

  const attractions = useMemo(() => data?.attractions || [], [data]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Attractions</h2>
          <p className="text-gray-500 text-sm">{data?.total ?? 0} total</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input flex-1 min-w-[140px] max-w-xs" placeholder="Search name…" />
        <select value={filter.category ?? ''}
          onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="input w-auto">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <input value={filter.district ?? ''}
          onChange={e => setFilter(f => ({ ...f, district: e.target.value }))}
          className="input w-auto max-w-[140px]" placeholder="District…" />
        <select value={filter.safetyStatus}
          onChange={e => setFilter(f => ({ ...f, safetyStatus: e.target.value }))}
          className="input w-auto">
          <option value="">All Safety</option>
          <option value="safe">Safe</option>
          <option value="caution">Caution</option>
          <option value="restricted">Restricted</option>
        </select>
        <select value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="input w-auto">
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        {(search || filter.category || filter.district || filter.safetyStatus || (filter.status && filter.status !== 'published')) && (
          <button
            onClick={() => { setSearch(''); setFilter({ safetyStatus: '', status: 'published', category: '', district: '' }); }}
            className="text-sm text-gray-500 hover:text-gray-800 underline whitespace-nowrap">
            Clear
          </button>
        )}
      </div>

      {/* List / Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Mobile: collapsible rows */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-4 py-12 text-center text-gray-400">Loading...</div>
          ) : !attractions.length ? (
            <div className="px-4 py-12 text-center text-gray-400">No attractions found</div>
          ) : attractions.map(a => (
            <AttractionMobileRow
              key={a.id}
              a={a}
              isSuperAdmin={isSuperAdmin}
              onEdit={openModal}
              onArchive={(id) => archiveMutation.mutate(id)}
              onUnarchive={(id) => unarchiveMutation.mutate(id)}
              onRefreshPhotos={(id) => refreshPhotosMutation.mutate(id)}
              onDelete={setDeleteConfirm}
              refreshingId={refreshPhotosMutation.isPending ? refreshPhotosMutation.variables : null}
            />
          ))}
        </div>
        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">District</th>
                <th className="px-4 py-3 font-medium">Safety</th>
                <th className="px-4 py-3 font-medium">Visits</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : !attractions.length ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No attractions found</td></tr>
              ) : attractions.map(a => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium truncate max-w-[200px]">{a.name}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{a.category}</td>
                  <td className="px-4 py-3 text-gray-600">{a.district || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={SAFETY_COLORS[a.safetyStatus]}>{a.safetyStatus}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.totalVisits}</td>
                  <td className="px-4 py-3 text-gray-600">{a.averageRating ? `${a.averageRating}` : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openModal(a)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Edit">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => refreshPhotosMutation.mutate(a.id)}
                        disabled={refreshPhotosMutation.isPending && refreshPhotosMutation.variables === a.id}
                        className="p-1.5 hover:bg-sky-50 rounded-lg text-sky-600 disabled:opacity-40"
                        title="Refresh photos"
                      >
                        <PhotoIcon className="w-4 h-4" />
                      </button>
                      {a.status === 'archived' ? (
                        <button onClick={() => unarchiveMutation.mutate(a.id)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600" title="Restore">
                          <ArchiveBoxXMarkIcon className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => archiveMutation.mutate(a.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Archive">
                          <ArchiveBoxIcon className="w-4 h-4" />
                        </button>
                      )}
                      {isSuperAdmin && (
                        <button onClick={() => setDeleteConfirm({ id: a.id, name: a.name })} className="p-1.5 hover:bg-red-100 rounded-lg text-red-700" title="Delete">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full"><TrashIcon className="w-5 h-5 text-red-600" /></div>
              <h3 className="text-lg font-bold text-gray-900">Permanently Delete</h3>
            </div>
            <p className="text-sm text-gray-600">
              Delete <strong>{deleteConfirm.name}</strong>? This <span className="text-red-600 font-medium">cannot be undone</span>.
            </p>
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">{editing ? 'Edit Attraction' : 'Add New Attraction'}</h3>

            {/* Places Search */}
            <div ref={acRef} className="relative">
              <label className="block text-xs font-medium mb-1 text-gray-600">Search a Place <span className="text-gray-400 font-normal">(auto-fills fields)</span></label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input value={acInput} onChange={handleAcInput}
                  onFocus={() => acResults.length && setAcOpen(true)}
                  className="input w-full pl-9 pr-10" placeholder="Type a place name in Cebu..." autoComplete="off" />
                {(acLoading || acFilling) && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              {acOpen && acResults.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                  {acResults.map((p) => (
                    <li key={p.placeId} onMouseDown={() => selectPlace(p)}
                      className="flex items-start gap-3 px-4 py-2.5 hover:bg-violet-50 cursor-pointer border-b border-gray-50 last:border-0">
                      <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.mainText}</p>
                        {p.secondaryText && <p className="text-xs text-gray-500 truncate">{p.secondaryText}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input w-full" placeholder="Attraction name" />
            </div>

            {/* AI Safety Tip */}
            {aiSafetyTip && (
              <div className="flex gap-2 p-3 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-800">
                <SparklesIcon className="w-4 h-4 shrink-0 mt-0.5 text-violet-500" />
                <div><strong>AI Safety Tip:</strong> {aiSafetyTip}</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input w-full">
                  {categories.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">District</label>
                <input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} className="input w-full" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input w-full" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input w-full h-20 resize-none" />
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium">Location Pin</label>
                  <button type="button" onClick={() => handleAiFill()} disabled={aiLoading || (!form.latitude && !form.longitude)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 disabled:opacity-40 disabled:cursor-not-allowed">
                    <SparklesIcon className={`w-3.5 h-3.5 ${aiLoading ? 'animate-pulse' : ''}`} />
                    {aiLoading ? 'Suggesting...' : 'Suggest from pin'}
                  </button>
                </div>
                <MapPicker lat={form.latitude} lng={form.longitude}
                  onChange={({ lat, lng }) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))} />
                <p className="text-xs text-gray-400 mt-1">Click map to pin. Use "Suggest from pin" to auto-fill details with AI.</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Safety Status</label>
                <select value={form.safetyStatus} onChange={e => setForm(f => ({ ...f, safetyStatus: e.target.value }))} className="input w-full">
                  <option value="safe">Safe</option>
                  <option value="caution">Caution</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Entrance Fee</label>
                <input type="number" value={form.entranceFee} onChange={e => setForm(f => ({ ...f, entranceFee: e.target.value }))} className="input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input w-full">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
