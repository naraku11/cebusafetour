import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, token, user, hydrate } = useAuthStore();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    hydrate();
    if (token) navigate('/dashboard', { replace: true });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      // Decode JWT to get role — more reliable than user object which may have enum issues
      let role = data?.user?.role;
      try {
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        role = payload.role || role;
      } catch {}
      const isAdmin = ['admin_super', 'admin_content', 'admin_emergency'].includes(role);
      if (!isAdmin) {
        useAuthStore.getState().logout();
        setError(`Access denied. Role "${role || 'unknown'}" is not an admin. Use: superadmin@cebusafetour.ph`);
        return;
      }
      toast.success('Welcome back!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error || 'Login failed. Check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-cebu-teal flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏖</div>
          <h1 className="text-2xl font-bold text-gray-900">CebuSafeTour</h1>
          <p className="text-gray-500 text-sm mt-1">Admin Portal — Secure Login</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="admin@cebusafetour.ph"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          CebuSafeTour © {new Date().getFullYear()} — Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}
