import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { TrashIcon, StarIcon, FunnelIcon } from '@heroicons/react/24/outline';
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

export default function Reviews() {
  const qc = useQueryClient();
  const [ratingFilter, setRatingFilter] = useState('');
  const [attractionFilter, setAttractionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, userName, attractionName }

  const params = { page, limit: 30 };
  if (ratingFilter) params.rating = ratingFilter;
  if (attractionFilter) params.attractionId = attractionFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', params],
    queryFn: () => api.get('/reviews', { params }).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: attractionsData } = useQuery({
    queryKey: ['attractions-simple'],
    queryFn: () => api.get('/attractions', { params: { limit: 200 } }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/reviews/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['attractions'] });
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total reviews</p>
        </div>
        <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <StarSolid className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-amber-700">{ratingAvg}</span>
          <span className="text-amber-600">avg across displayed reviews</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <FunnelIcon className="w-4 h-4 text-gray-400" />

        <select
          value={attractionFilter}
          onChange={(e) => { setAttractionFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Attractions</option>
          {attractions.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <select
          value={ratingFilter}
          onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Ratings</option>
          {RATINGS.map((r) => (
            <option key={r} value={r}>{r} Star{r !== 1 ? 's' : ''}</option>
          ))}
        </select>

        {(attractionFilter || ratingFilter) && (
          <button
            onClick={() => { setAttractionFilter(''); setRatingFilter(''); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <StarIcon className="w-10 h-10" />
            <p>No reviews found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Attraction</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rating</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Comment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviews.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
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
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete review"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Review?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Delete the review by <strong>{deleteConfirm.userName ?? 'this user'}</strong> for{' '}
              <strong>{deleteConfirm.attractionName ?? 'this attraction'}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
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
