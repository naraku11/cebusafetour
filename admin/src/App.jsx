import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
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

const ProtectedRoute = ({ children }) => {
  const token = useAuthStore(s => s.token);
  return token ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="attractions" element={<Attractions />} />
        <Route path="advisories" element={<Advisories />} />
        <Route path="emergency" element={<Emergency />} />
        <Route path="users" element={<Users />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reviews" element={<Reviews />} />
      </Route>
    </Routes>
  );
}
