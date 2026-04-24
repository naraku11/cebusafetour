import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { TrashIcon, StarIcon, ArrowPathIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const RATINGS = [1, 2, 3, 4, 5];

function StarDisplay({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {RATINGS.map((s) =>
        s <= rating
          ? <StarSolid key={s} className="w-4 h-4 text-amber-400" />
          : <StarIcon key={s} className="w-4 h-4 text-gray-300" />
      )}
    </span>
  );
}

function ReviewMobileRow({ r, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {r.user?.profilePicture ? (
          <img src={r.user.profilePicture} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
            {r.user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <span className="flex-1 font-medium text-sm leading-snug break-words min-w-0">{r.user?.name ?? 'Unknown'}</span>
        <StarDisplay rating={r.rating} />
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-3">
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Attraction</dt>
              <dd className="text-gray-700 font-medium">{r.attraction?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Date</dt>
              <dd className="text-gray-700">
                {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </dd>
            </div>
            {r.comment && (
              <div className="col-span-2">
                <dt className="text-gray-400 text-xs mb-0.5">Comment</dt>
                <dd className="text-gray-700 text-sm">{r.comment}</dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onDelete({ id: r.id, userName: r.user?.name, attractionName: r.attraction?.name })}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg"
            >
              <TrashIcon className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reviews() {
  const qc = useQueryClient();
  const [ratingFilter, setRatingFilter] = useState('');
  const [attractionFilter, setAttractionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const params = { page, limit: 30 };
  if (ratingFilter) params.rating = ratingFilter;
  if (attractionFilter) params.attractionId = attractionFilter;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['reviews', params],
    queryFn: () => api.get('/reviews', { params }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: attractionsData } = useQuery({
    queryKey: ['attractions', { limit: 200 }],
    queryFn: () => api.get('/attractions', { params: { limit: 200 } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/reviews/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['reviews'] });
      await qc.invalidateQueries({ queryKey: ['attractions'] });
      toast.success('Review deleted');
      setDeleteConfirm(null);
    },
  });

  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const attractions = attractionsData?.attractions ?? [];

  const ratingAvg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '–';

  const hasFilter = ratingFilter || attractionFilter;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Reviews</h2>
          <p className="text-gray-500 text-sm">{total} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['reviews'] })}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            title="Refresh reviews"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <StarSolid className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-amber-700">{ratingAvg}</span>
            <span className="text-amber-600 hidden sm:inline">avg</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={attractionFilter}
          onChange={(e) => { setAttractionFilter(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">All Attractions</option>
          {attractions.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <select
          value={ratingFilter}
          onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">All Ratings</option>
          {RATINGS.map((r) => (
            <option key={r} value={r}>{r} Star{r !== 1 ? 's' : ''}</option>
          ))}
        </select>

        {hasFilter && (
          <button
            onClick={() => { setAttractionFilter(''); setRatingFilter(''); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-800 underline whitespace-nowrap"
          >
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
          ) : !reviews.length ? (
            <div className="px-4 py-12 text-center text-gray-400">No reviews found</div>
          ) : reviews.map((r) => (
            <ReviewMobileRow key={r.id} r={r} onDelete={setDeleteConfirm} />
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Attraction</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Comment</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : !reviews.length ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No reviews found</td></tr>
              ) : reviews.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">
                    {r.attraction?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.user?.profilePicture ? (
                        <img src={r.user.profilePicture} className="w-7 h-7 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                          {r.user?.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 leading-tight">{r.user?.name ?? 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{r.user?.email ?? ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StarDisplay rating={r.rating} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[240px]">
                    {r.comment ? (
                      <span className="line-clamp-2">{r.comment}</span>
                    ) : (
                      <span className="text-gray-300 italic text-xs">No comment</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDeleteConfirm({ id: r.id, userName: r.user?.name, attractionName: r.attraction?.name })}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                      title="Delete review"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <TrashIcon className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Review?</h3>
            </div>
            <p className="text-sm text-gray-600">
              Delete the review by <strong>{deleteConfirm.userName ?? 'this user'}</strong> for{' '}
              <strong>{deleteConfirm.attractionName ?? 'this attraction'}</strong>?{' '}
              This <span className="text-red-600 font-medium">cannot be undone</span>.
            </p>
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
