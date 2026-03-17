import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
  UsersIcon, MapPinIcon, ShieldExclamationIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="card flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const { data: summary } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: () => api.get('/reports/summary').then(r => r.data),
  });

  const { data: incidentsData } = useQuery({
    queryKey: ['incidents-report'],
    queryFn: () => api.get('/reports/incidents').then(r => r.data),
  });

  const { data: attractionsData } = useQuery({
    queryKey: ['attractions-report'],
    queryFn: () => api.get('/reports/attractions').then(r => r.data),
  });

  const topAttractions = attractionsData?.attractions?.slice(0, 5) || [];
  const incidentCounts = { medical: 0, fire: 0, crime: 0, natural_disaster: 0, lost_person: 0 };
  incidentsData?.incidents?.forEach(i => { if (incidentCounts[i.type] !== undefined) incidentCounts[i.type]++; });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm">Overview of CebuSafeTour activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={summary?.totalUsers} icon={UsersIcon} color="bg-primary-600" />
        <StatCard label="Attractions" value={summary?.totalAttractions} icon={MapPinIcon} color="bg-cebu-teal" />
        <StatCard label="Total Incidents" value={summary?.totalIncidents} icon={ShieldExclamationIcon} color="bg-cebu-orange" />
        <StatCard label="Active Advisories" value={summary?.activeAdvisories} icon={ExclamationTriangleIcon} color="bg-red-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Incident Types</h3>
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
          <h3 className="font-semibold text-gray-900 mb-4">Top Attractions by Visits</h3>
          {topAttractions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topAttractions.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-gray-500">{a.totalVisits} visits</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${Math.min(100, (a.totalVisits / (topAttractions[0]?.totalVisits || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Incidents</h3>
        {!incidentsData?.incidents?.length ? (
          <p className="text-gray-400 text-sm">No incidents reported</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Location</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {incidentsData.incidents.slice(0, 5).map(inc => (
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
                    <td className="py-3 text-gray-500">{new Date(inc.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
