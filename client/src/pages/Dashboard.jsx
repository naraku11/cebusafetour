import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
  UsersIcon, MapPinIcon, ShieldExclamationIcon, ExclamationTriangleIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, CheckCircleIcon,
  ClockIcon, FireIcon,
} from '@heroicons/react/24/outline';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const StatCard = ({ label, value, sub, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 flex items-start gap-3 shadow-sm">
    <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 truncate">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
    </div>
    {trend !== undefined && trend !== null && (
      <div className={`ml-auto text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
        {trend >= 0
          ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
          : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />}
        {Math.abs(trend)}
      </div>
    )}
  </div>
);

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 } } },
  },
};

const doughnutOpts = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } } },
};

const statusColors = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
};

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: () => api.get('/reports/summary').then(r => r.data),
    staleTime: 60_000,
  });

  const { data: trends } = useQuery({
    queryKey: ['reports-trends'],
    queryFn: () => api.get('/reports/trends').then(r => r.data),
    staleTime: 60_000,
  });

  const { data: incidentsData } = useQuery({
    queryKey: ['reports-incidents'],
    queryFn: () => api.get('/reports/incidents').then(r => r.data),
    staleTime: 60_000,
  });

  const { data: attractionsData } = useQuery({
    queryKey: ['reports-attractions'],
    queryFn: () => api.get('/reports/attractions').then(r => r.data),
    staleTime: 60_000,
  });

  const s = summary || {};
  const topAttractions = attractionsData?.attractions?.slice(0, 5) || [];
  const recentIncidents = incidentsData?.incidents?.slice(0, 5) || [];
  const byType = incidentsData?.byType || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm">Overview of CebuSafeTour activity</p>
      </div>

      {/* Stats Grid */}
      {loadingSummary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 h-24 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
              <div className="h-6 bg-gray-200 rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Users"
            value={s.users?.total ?? 0}
            sub={`${s.users?.active ?? 0} active`}
            icon={UsersIcon}
            color="bg-sky-500"
            trend={s.users?.newThisMonth}
          />
          <StatCard
            label="Attractions"
            value={s.attractions?.total ?? 0}
            sub={`${s.attractions?.safe ?? 0} safe`}
            icon={MapPinIcon}
            color="bg-teal-500"
          />
          <StatCard
            label="Incidents"
            value={s.incidents?.total ?? 0}
            sub={`${s.incidents?.active ?? 0} active`}
            icon={ShieldExclamationIcon}
            color="bg-orange-500"
            trend={s.incidents?.thisMonth}
          />
          <StatCard
            label="Advisories"
            value={s.advisories?.active ?? 0}
            sub={s.advisories?.critical ? `${s.advisories.critical} critical` : 'None critical'}
            icon={ExclamationTriangleIcon}
            color="bg-red-500"
          />
        </div>
      )}

      {/* Quick Stats Row */}
      {s.incidents && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 text-center">
            <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{s.incidents.resolveRate}%</p>
            <p className="text-xs text-gray-500">Resolve Rate</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 text-center">
            <ClockIcon className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{s.incidents.today}</p>
            <p className="text-xs text-gray-500">Today</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 text-center">
            <FireIcon className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{s.advisories?.critical ?? 0}</p>
            <p className="text-xs text-gray-500">Critical Alerts</p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trends Line Chart */}
        {trends && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">6-Month Trends</h3>
            <div className="h-52">
              <Line
                data={{
                  labels: trends.labels,
                  datasets: [
                    {
                      label: 'Incidents',
                      data: trends.incidents,
                      borderColor: '#f97316',
                      backgroundColor: 'rgba(249,115,22,0.08)',
                      fill: true,
                      tension: 0.3,
                      pointRadius: 3,
                    },
                    {
                      label: 'New Users',
                      data: trends.users,
                      borderColor: '#0ea5e9',
                      backgroundColor: 'rgba(14,165,233,0.08)',
                      fill: true,
                      tension: 0.3,
                      pointRadius: 3,
                    },
                  ],
                }}
                options={{
                  ...chartOpts,
                  plugins: {
                    legend: { display: true, position: 'top', labels: { usePointStyle: true, font: { size: 11 }, padding: 12 } },
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* Incident Types Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Incidents by Type</h3>
          <div className="h-52">
            {byType.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            ) : (
              <Bar
                data={{
                  labels: byType.map(t => t.type.replace('_', ' ')),
                  datasets: [{
                    label: 'Count',
                    data: byType.map(t => t.count),
                    backgroundColor: ['#0ea5e9', '#f97316', '#ef4444', '#8b5cf6', '#14b8a6'],
                    borderRadius: 6,
                  }],
                }}
                options={chartOpts}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Attractions + Safety */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Attractions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Top Attractions</h3>
          {topAttractions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-2.5">
              {topAttractions.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs w-4 text-right shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm mb-1 gap-2">
                      <span className="font-medium truncate">{a.name}</span>
                      <span className="text-gray-500 shrink-0 text-xs">{a.totalVisits} visits</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (a.totalVisits / (topAttractions[0]?.totalVisits || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safety Doughnut */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Safety Status</h3>
          {s.attractions ? (
            <div className="h-48">
              <Doughnut
                data={{
                  labels: ['Safe', 'Caution', 'Danger'],
                  datasets: [{
                    data: [s.attractions.safe, s.attractions.caution, s.attractions.danger],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 0,
                  }],
                }}
                options={doughnutOpts}
              />
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
          )}
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Recent Incidents</h3>
        {recentIncidents.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No incidents reported</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2.5 pl-4 sm:pl-5 font-medium">Type</th>
                  <th className="pb-2.5 font-medium">Location</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 pr-4 sm:pr-5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentIncidents.map(inc => (
                  <tr key={inc.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 pl-4 sm:pl-5 capitalize">{(inc.type || '').replace('_', ' ')}</td>
                    <td className="py-2.5 text-gray-500 max-w-[180px] truncate">
                      {inc.nearestLandmark || (inc.latitude ? `${Number(inc.latitude).toFixed(4)}, ${Number(inc.longitude).toFixed(4)}` : '—')}
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inc.status] || 'bg-gray-100 text-gray-600'}`}>
                        {(inc.status || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 sm:pr-5 text-gray-500 whitespace-nowrap">
                      {inc.createdAt ? new Date(inc.createdAt).toLocaleDateString() : '—'}
                    </td>
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
