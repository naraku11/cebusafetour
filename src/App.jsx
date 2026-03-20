import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attractions from './pages/Attractions';
import Advisories from './pages/Advisories';
import Emergency from './pages/Emergency';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Reviews from './pages/Reviews';

// Pages each role is allowed to access
const ROLE_PAGES = {
  admin_super:     ['/dashboard', '/attractions', '/reviews', '/advisories', '/emergency', '/users', '/notifications', '/reports'],
  admin_content:   ['/dashboard', '/attractions', '/reviews', '/advisories',                          '/notifications', '/reports'],
  admin_emergency: ['/dashboard',                                             '/emergency',            '/notifications', '/reports'],
};

// First page to land on after login, per role
const ROLE_HOME = {
  admin_super:     '/dashboard',
  admin_content:   '/dashboard',
  admin_emergency: '/emergency',
};

/** Blocks access to any route the current role cannot reach. */
function RoleRoute({ path, children }) {
  const { user } = useAuthStore();
  const role = user?.role ?? '';
  const allowed = ROLE_PAGES[role] ?? [];
  if (!allowed.includes(path)) {
    return <Navigate to={ROLE_HOME[role] ?? '/dashboard'} replace />;
  }
  return children;
}

/** Redirects unauthenticated users to /login. */
const ProtectedRoute = ({ children }) => {
  const { token, hydrate } = useAuthStore();
  useEffect(() => { hydrate(); }, []);
  useRealtimeSync();
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  const { user } = useAuthStore();
  const home = ROLE_HOME[user?.role] ?? '/dashboard';

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to={home} replace />} />
        <Route path="dashboard"    element={<RoleRoute path="/dashboard">   <Dashboard />   </RoleRoute>} />
        <Route path="attractions"  element={<RoleRoute path="/attractions">  <Attractions /> </RoleRoute>} />
        <Route path="reviews"      element={<RoleRoute path="/reviews">      <Reviews />     </RoleRoute>} />
        <Route path="advisories"   element={<RoleRoute path="/advisories">   <Advisories />  </RoleRoute>} />
        <Route path="emergency"    element={<RoleRoute path="/emergency">    <Emergency />   </RoleRoute>} />
        <Route path="users"        element={<RoleRoute path="/users">        <Users />       </RoleRoute>} />
        <Route path="notifications" element={<RoleRoute path="/notifications"><Notifications /></RoleRoute>} />
        <Route path="reports"      element={<RoleRoute path="/reports">      <Reports />     </RoleRoute>} />
      </Route>
    </Routes>
  );
}
