import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { format } from 'date-fns';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function Reports() {
  const { data: incidentsData } = useQuery({
    queryKey: ['incidents-full'],
    queryFn: () => api.get('/reports/incidents', { params: { limit: 200 } }).then(r => r.data),
  });

  const { data: attractionsData } = useQuery({
    queryKey: ['attractions-report'],
    queryFn: () => api.get('/reports/attractions').then(r => r.data),
  });

  const incidentCounts = { medical: 0, fire: 0, crime: 0, natural_disaster: 0, lost_person: 0 };
  incidentsData?.incidents?.forEach(i => { if (incidentCounts[i.type] !== undefined) incidentCounts[i.type]++; });

  const statusCounts = { new: 0, in_progress: 0, resolved: 0 };
  incidentsData?.incidents?.forEach(i => { if (statusCounts[i.status] !== undefined) statusCounts[i.status]++; });

  const handleExportCSV = (data, filename) => {
    if (!data?.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${filename}_${format(new Date(), 'yyyyMMdd')}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
        <p className="text-gray-500 text-sm">Overview of system data</p>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Incidents by Type</h3>
          <Bar
            data={{
              labels: ['Medical', 'Fire', 'Crime', 'Disaster', 'Lost Person'],
              datasets: [{
                label: 'Incidents',
                data: Object.values(incidentCounts),
                backgroundColor: ['#0ea5e9', '#f97316', '#ef4444', '#8b5cf6', '#14b8a6'],
                borderRadius: 6,
              }],
            }}
            options={{ responsive: true, plugins: { legend: { display: false } } }}
          />
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Incident Status Distribution</h3>
          <div className="flex justify-center">
            <div style={{ maxWidth: 240 }}>
              <Pie
                data={{
                  labels: ['New', 'In Progress', 'Resolved'],
                  datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                  }],
                }}
                options={{ responsive: true }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Incidents table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Incident Log</h3>
          <button
            onClick={() => handleExportCSV(incidentsData?.incidents, 'incidents')}
            className="btn-secondary text-xs flex items-center gap-1"
          >
            <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-gray-100">
              <tr>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Location</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Assigned To</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {incidentsData?.incidents?.slice(0, 50).map(inc => (
                <tr key={inc.id}>
                  <td className="py-3 capitalize">{inc.type.replace('_', ' ')}</td>
                  <td className="py-3 text-gray-500">{inc.nearestLandmark || `${inc.latitude}, ${inc.longitude}`}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      inc.status === 'new' ? 'bg-red-100 text-red-700' :
                      inc.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>{inc.status.replace('_', ' ')}</span>
                  </td>
                  <td className="py-3 text-gray-500">{inc.assignedTo || '—'}</td>
                  <td className="py-3 text-gray-500">{format(new Date(inc.createdAt), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Attractions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Attraction Analytics</h3>
          <button
            onClick={() => handleExportCSV(attractionsData?.attractions, 'attractions')}
            className="btn-secondary text-xs flex items-center gap-1"
          >
            <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-gray-100">
              <tr>
                <th className="pb-3 font-medium">Attraction</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Visits</th>
                <th className="pb-3 font-medium">Saves</th>
                <th className="pb-3 font-medium">Rating</th>
                <th className="pb-3 font-medium">Safety</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {attractionsData?.attractions?.map(a => (
                <tr key={a.id}>
                  <td className="py-3 font-medium">{a.name}</td>
                  <td className="py-3 capitalize text-gray-500">{a.category}</td>
                  <td className="py-3 text-gray-600">{a.totalVisits}</td>
                  <td className="py-3 text-gray-600">{a.totalSaves}</td>
                  <td className="py-3 text-gray-600">{a.averageRating ? `⭐ ${a.averageRating}` : '—'}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      a.safetyStatus === 'safe' ? 'bg-green-100 text-green-700' :
                      a.safetyStatus === 'caution' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{a.safetyStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
