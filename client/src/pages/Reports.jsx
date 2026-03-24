import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Bar, Pie, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { format } from 'date-fns';
import {
  ArrowDownTrayIcon, UsersIcon, ShieldExclamationIcon,
  ExclamationTriangleIcon, MapPinIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend,
);

// ── helpers ───────────────────────────────────────────────────────────────────
const exportCSV = (data, filename) => {
  if (!data?.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(r =>
    Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','),
  ).join('\n');
  const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}_${format(new Date(), 'yyyyMMdd')}.csv`;
  a.click();
};

const CHART_OPTS = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};

const DONUT_OPTS = { responsive: true, plugins: { legend: { position: 'bottom' } } };

const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className="card flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color} shrink-0`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const SectionHeader = ({ title, children }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-semibold text-gray-900">{title}</h3>
    {children}
  </div>
);

const ExportBtn = ({ onClick }) => (
  <button onClick={onClick} className="btn-secondary text-xs flex items-center gap-1">
    <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
  </button>
);

// ── role-tab map ──────────────────────────────────────────────────────────────
const ROLE_TABS = {
  admin_super:     ['overview', 'users', 'incidents', 'advisories', 'attractions'],
  admin_content:   ['overview', 'advisories', 'attractions'],
  admin_emergency: ['overview', 'incidents'],
};

const TAB_LABELS = {
  overview:    'Overview',
  users:       'Users',
  incidents:   'Incidents',
  advisories:  'Advisories',
  attractions: 'Attractions',
};

// ─────────────────────────────────────────────────────────────────────────────
// Overview tab
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ role }) {
  const { data: summary } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: () => api.get('/reports/summary').then(r => r.data),
  });
  const { data: trends } = useQuery({
    queryKey: ['reports-trends'],
    queryFn: () => api.get('/reports/trends').then(r => r.data),
  });

  const showUsers      = role === 'admin_super';
  const showIncidents  = role !== 'admin_content';
  const showAdvisories = role !== 'admin_emergency';
  const showAttr       = role !== 'admin_emergency';

  const trendData = {
    labels: trends?.labels ?? [],
    datasets: [
      showIncidents && {
        label: 'Incidents',
        data: trends?.incidents ?? [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.1)',
        tension: 0.4,
        fill: true,
      },
      showAdvisories && {
        label: 'Advisories',
        data: trends?.advisories ?? [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.1)',
        tension: 0.4,
        fill: true,
      },
      showUsers && {
        label: 'New Users',
        data: trends?.users ?? [],
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14,165,233,0.1)',
        tension: 0.4,
        fill: true,
      },
    ].filter(Boolean),
  };

  return (
    <div className="space-y-6">
      {/* Stat cards — filtered per role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {showUsers && (
          <StatCard
            label="Total Users"
            value={summary?.users?.total}
            sub={`${summary?.users?.active ?? 0} active`}
            icon={UsersIcon}
            color="bg-primary-600"
          />
        )}
        {showAttr && (
          <StatCard
            label="Attractions"
            value={summary?.attractions?.total}
            sub={`${summary?.attractions?.safe ?? 0} safe`}
            icon={MapPinIcon}
            color="bg-teal-500"
          />
        )}
        {showIncidents && (
          <StatCard
            label="Total Incidents"
            value={summary?.incidents?.total}
            sub={`${summary?.incidents?.active ?? 0} active`}
            icon={ShieldExclamationIcon}
            color="bg-orange-500"
          />
        )}
        {showAdvisories && (
          <StatCard
            label="Active Advisories"
            value={summary?.advisories?.active}
            sub={`${summary?.advisories?.critical ?? 0} critical`}
            icon={ExclamationTriangleIcon}
            color="bg-red-500"
          />
        )}
        {showIncidents && (
          <StatCard
            label="Incidents Today"
            value={summary?.incidents?.today}
            sub={`${summary?.incidents?.resolveRate ?? 0}% resolve rate`}
            icon={ChartBarIcon}
            color="bg-violet-500"
          />
        )}
      </div>

      {/* 6-month trend */}
      <div className="card">
        <SectionHeader title="6-Month Activity Trend" />
        <Line
          data={trendData}
          options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
          }}
        />
      </div>

      {/* Quick breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {showIncidents && summary?.incidents && (
          <div className="card">
            <h4 className="font-medium text-gray-700 mb-3">Incident Status</h4>
            <Doughnut
              data={{
                labels: ['Active', 'Resolved'],
                datasets: [{
                  data: [summary.incidents.active, summary.incidents.resolved],
                  backgroundColor: ['#ef4444', '#10b981'],
                  borderWidth: 0,
                }],
              }}
              options={DONUT_OPTS}
            />
          </div>
        )}
        {showAdvisories && summary?.advisories && (
          <div className="card">
            <h4 className="font-medium text-gray-700 mb-3">Advisories</h4>
            <Doughnut
              data={{
                labels: ['Active', 'Inactive'],
                datasets: [{
                  data: [summary.advisories.active, summary.advisories.total - summary.advisories.active],
                  backgroundColor: ['#f59e0b', '#d1d5db'],
                  borderWidth: 0,
                }],
              }}
              options={DONUT_OPTS}
            />
          </div>
        )}
        {showAttr && summary?.attractions && (
          <div className="card">
            <h4 className="font-medium text-gray-700 mb-3">Attraction Safety</h4>
            <Doughnut
              data={{
                labels: ['Safe', 'Caution', 'Danger'],
                datasets: [{
                  data: [
                    summary.attractions.safe,
                    summary.attractions.caution,
                    summary.attractions.danger,
                  ],
                  backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                  borderWidth: 0,
                }],
              }}
              options={DONUT_OPTS}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Users tab (super admin only)
// ─────────────────────────────────────────────────────────────────────────────
function UsersTab() {
  const { data: summary } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: () => api.get('/reports/summary').then(r => r.data),
  });
  const { data: usersSummary } = useQuery({
    queryKey: ['reports-users-summary'],
    queryFn: () => api.get('/reports/users-summary').then(r => r.data),
  });

  const statusData = {
    labels: ['Active', 'Suspended', 'Banned'],
    datasets: [{
      data: [
        summary?.users?.active ?? 0,
        summary?.users?.suspended ?? 0,
        summary?.users?.banned ?? 0,
      ],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 0,
    }],
  };

  const nationalityData = {
    labels: usersSummary?.byNationality?.map(n => n.name) ?? [],
    datasets: [{
      label: 'Users',
      data: usersSummary?.byNationality?.map(n => n.count) ?? [],
      backgroundColor: '#0ea5e9',
      borderRadius: 4,
    }],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total',     value: summary?.users?.total,        color: 'bg-gray-100 text-gray-700' },
          { label: 'Active',    value: summary?.users?.active,        color: 'bg-green-100 text-green-700' },
          { label: 'Suspended', value: summary?.users?.suspended,     color: 'bg-yellow-100 text-yellow-700' },
          { label: 'Banned',    value: summary?.users?.banned,        color: 'bg-red-100 text-red-700' },
        ].map(c => (
          <div key={c.label} className={`card text-center ${c.color}`}>
            <p className="text-3xl font-bold">{c.value ?? '—'}</p>
            <p className="text-sm mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <SectionHeader title="User Status Distribution" />
          <div className="flex justify-center">
            <div style={{ maxWidth: 260 }}>
              <Pie data={statusData} options={DONUT_OPTS} />
            </div>
          </div>
        </div>
        <div className="card">
          <SectionHeader title="Email Verification" />
          <div className="flex justify-center">
            <div style={{ maxWidth: 260 }}>
              <Doughnut
                data={{
                  labels: ['Verified', 'Unverified'],
                  datasets: [{
                    data: [
                      usersSummary?.verification?.verified ?? 0,
                      usersSummary?.verification?.unverified ?? 0,
                    ],
                    backgroundColor: ['#10b981', '#d1d5db'],
                    borderWidth: 0,
                  }],
                }}
                options={DONUT_OPTS}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <SectionHeader title="Top 10 Nationalities" />
        <Bar data={nationalityData} options={CHART_OPTS} />
      </div>

      <div className="card">
        <SectionHeader title="Registration This Month">
          <span className="text-2xl font-bold text-primary-600">
            {summary?.users?.newThisMonth ?? '—'}
          </span>
        </SectionHeader>
        <p className="text-sm text-gray-500">New tourist accounts registered in the current month.</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Incidents tab
// ─────────────────────────────────────────────────────────────────────────────
function IncidentsTab() {
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');
  const [type,   setTypeFilter]   = useState('');
  const [status, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const params = { page, limit: LIMIT };
  if (from)   params.from   = from;
  if (to)     params.to     = to;
  if (type)   params.type   = type;
  if (status) params.status = status;

  const { data, isLoading } = useQuery({
    queryKey: ['reports-incidents', params],
    queryFn: () => api.get('/reports/incidents', { params }).then(r => r.data),
  });

  const typeColors = {
    medical: '#0ea5e9', fire: '#f97316', crime: '#ef4444',
    natural_disaster: '#8b5cf6', lost_person: '#14b8a6',
  };

  const typeChart = {
    labels: data?.byType?.map(r => r.type.replace('_', ' ')) ?? [],
    datasets: [{
      label: 'Count',
      data: data?.byType?.map(r => r.count) ?? [],
      backgroundColor: data?.byType?.map(r => typeColors[r.type] ?? '#64748b') ?? [],
      borderRadius: 4,
    }],
  };

  const statusChart = {
    labels: data?.byStatus?.map(r => r.status.replace('_', ' ')) ?? [],
    datasets: [{
      data: data?.byStatus?.map(r => r.count) ?? [],
      backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
      borderWidth: 0,
    }],
  };

  const totalPages = data?.total ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <SectionHeader title="By Type" />
          <Bar data={typeChart} options={CHART_OPTS} />
        </div>
        <div className="card">
          <SectionHeader title="By Status" />
          <div className="flex justify-center">
            <div style={{ maxWidth: 260 }}>
              <Doughnut data={statusChart} options={DONUT_OPTS} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
            className="input text-sm" placeholder="From" />
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
            className="input text-sm" placeholder="To" />
          <select value={type} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="input text-sm">
            <option value="">All types</option>
            {['medical', 'fire', 'crime', 'natural_disaster', 'lost_person'].map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
          <select value={status} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input text-sm">
            <option value="">All statuses</option>
            {['new', 'in_progress', 'resolved'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          {(from || to || type || status) && (
            <button className="btn-secondary text-sm" onClick={() => {
              setFrom(''); setTo(''); setTypeFilter(''); setStatusFilter(''); setPage(1);
            }}>Clear</button>
          )}
          <div className="ml-auto">
            <ExportBtn onClick={() => exportCSV(data?.incidents, 'incidents')} />
          </div>
        </div>

        {/* Table */}
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
              {isLoading ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : data?.incidents?.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">No incidents found</td></tr>
              ) : data?.incidents?.map(inc => (
                <tr key={inc.id} className="hover:bg-gray-50">
                  <td className="py-3 capitalize">{inc.type.replace('_', ' ')}</td>
                  <td className="py-3 text-gray-500 max-w-xs truncate">
                    {inc.nearestLandmark || `${inc.latitude?.toFixed(4)}, ${inc.longitude?.toFixed(4)}`}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      inc.status === 'new'         ? 'bg-red-100 text-red-700' :
                      inc.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                                                     'bg-green-100 text-green-700'
                    }`}>{inc.status.replace('_', ' ')}</span>
                  </td>
                  <td className="py-3 text-gray-500">{inc.assignedTo || '—'}</td>
                  <td className="py-3 text-gray-500 whitespace-nowrap">
                    {format(new Date(inc.createdAt), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.total > LIMIT && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>{data.total} total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1} className="btn-secondary disabled:opacity-40 text-xs">Prev</button>
              <span className="px-2 py-1">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages} className="btn-secondary disabled:opacity-40 text-xs">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Advisories tab
// ─────────────────────────────────────────────────────────────────────────────
function AdvisoriesTab() {
  const { data } = useQuery({
    queryKey: ['reports-advisories'],
    queryFn: () => api.get('/reports/advisories').then(r => r.data),
  });

  const severityColors = {
    low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
  };

  const severityChart = {
    labels: data?.bySeverity?.map(r => r.severity) ?? [],
    datasets: [{
      data: data?.bySeverity?.map(r => r.count) ?? [],
      backgroundColor: data?.bySeverity?.map(r => severityColors[r.severity] ?? '#64748b') ?? [],
      borderWidth: 0,
    }],
  };

  const statusChart = {
    labels: data?.byStatus?.map(r => r.status) ?? [],
    datasets: [{
      label: 'Count',
      data: data?.byStatus?.map(r => r.count) ?? [],
      backgroundColor: ['#f59e0b', '#d1d5db'],
      borderRadius: 4,
    }],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <SectionHeader title="By Severity" />
          <div className="flex justify-center">
            <div style={{ maxWidth: 260 }}>
              <Doughnut data={severityChart} options={DONUT_OPTS} />
            </div>
          </div>
        </div>
        <div className="card">
          <SectionHeader title="By Status" />
          <Bar data={statusChart} options={CHART_OPTS} />
        </div>
      </div>

      {/* Recent advisories */}
      <div className="card">
        <SectionHeader title="Recent Advisories (last 15)">
          <ExportBtn onClick={() => exportCSV(data?.recent, 'advisories')} />
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-gray-100">
              <tr>
                <th className="pb-3 font-medium">Title</th>
                <th className="pb-3 font-medium">Location</th>
                <th className="pb-3 font-medium">Severity</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.recent?.map(adv => (
                <tr key={adv.id} className="hover:bg-gray-50">
                  <td className="py-3 font-medium max-w-xs truncate">{adv.title}</td>
                  <td className="py-3 text-gray-500">{adv.location || '—'}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      adv.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      adv.severity === 'high'     ? 'bg-orange-100 text-orange-700' :
                      adv.severity === 'medium'   ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-green-100 text-green-700'
                    }`}>{adv.severity}</span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      adv.status === 'active' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    }`}>{adv.status}</span>
                  </td>
                  <td className="py-3 text-gray-500 whitespace-nowrap">
                    {format(new Date(adv.createdAt), 'MMM d, yyyy')}
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

// ─────────────────────────────────────────────────────────────────────────────
// Attractions tab
// ─────────────────────────────────────────────────────────────────────────────
function AttractionsTab() {
  const { data } = useQuery({
    queryKey: ['reports-attractions'],
    queryFn: () => api.get('/reports/attractions').then(r => r.data),
  });

  const categoryChart = {
    labels: data?.byCategory?.map(r => r.category) ?? [],
    datasets: [{
      label: 'Attractions',
      data: data?.byCategory?.map(r => r.count) ?? [],
      backgroundColor: '#0ea5e9',
      borderRadius: 4,
    }],
  };

  const safetyChart = {
    labels: data?.bySafety?.map(r => r.safety) ?? [],
    datasets: [{
      data: data?.bySafety?.map(r => r.count) ?? [],
      backgroundColor: data?.bySafety?.map(r =>
        r.safety === 'safe' ? '#10b981' : r.safety === 'caution' ? '#f59e0b' : '#ef4444',
      ) ?? [],
      borderWidth: 0,
    }],
  };

  const top5 = data?.attractions?.slice(0, 5) ?? [];
  const visitsChart = {
    labels: top5.map(a => a.name.length > 20 ? a.name.slice(0, 20) + '…' : a.name),
    datasets: [{
      label: 'Total Visits',
      data: top5.map(a => a.totalVisits),
      backgroundColor: '#8b5cf6',
      borderRadius: 4,
    }],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <SectionHeader title="By Category" />
          <Bar data={categoryChart} options={CHART_OPTS} />
        </div>
        <div className="card">
          <SectionHeader title="Safety Status" />
          <div className="flex justify-center">
            <div style={{ maxWidth: 220 }}>
              <Doughnut data={safetyChart} options={DONUT_OPTS} />
            </div>
          </div>
        </div>
        <div className="card">
          <SectionHeader title="Top 5 by Visits" />
          <Bar data={visitsChart} options={{ ...CHART_OPTS, indexAxis: 'y' }} />
        </div>
      </div>

      {/* Full table */}
      <div className="card">
        <SectionHeader title="All Attractions">
          <ExportBtn onClick={() => exportCSV(data?.attractions, 'attractions')} />
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-gray-100">
              <tr>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">District</th>
                <th className="pb-3 font-medium">Visits</th>
                <th className="pb-3 font-medium">Saves</th>
                <th className="pb-3 font-medium">Rating</th>
                <th className="pb-3 font-medium">Safety</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.attractions?.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="py-3 font-medium">{a.name}</td>
                  <td className="py-3 capitalize text-gray-500">{a.category}</td>
                  <td className="py-3 text-gray-500">{a.district || '—'}</td>
                  <td className="py-3 text-gray-600">{a.totalVisits?.toLocaleString()}</td>
                  <td className="py-3 text-gray-600">{a.totalSaves?.toLocaleString()}</td>
                  <td className="py-3 text-gray-600">
                    {a.averageRating ? `⭐ ${Number(a.averageRating).toFixed(1)}` : '—'}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      a.safetyStatus === 'safe'    ? 'bg-green-100 text-green-700' :
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

// ─────────────────────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────────────────────
export default function Reports() {
  const role = useAuthStore(s => s.user?.role) ?? 'admin_super';
  const tabs = ROLE_TABS[role] ?? ROLE_TABS.admin_super;
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
        <p className="text-gray-500 text-sm">Comprehensive data overview for CebuSafeTour</p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 -mb-px min-w-max">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview'    && <OverviewTab role={role} />}
      {activeTab === 'users'       && <UsersTab />}
      {activeTab === 'incidents'   && <IncidentsTab />}
      {activeTab === 'advisories'  && <AdvisoriesTab />}
      {activeTab === 'attractions' && <AttractionsTab />}
    </div>
  );
}
