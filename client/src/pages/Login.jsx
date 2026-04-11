import { useState, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Login() {
  const emailId    = useId();
  const passwordId = useId();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const { login, token, hydrate } = useAuthStore();
  const { dark, toggle, init }    = useThemeStore();
  const navigate = useNavigate();

  useEffect(() => {
    init();         // apply persisted theme
    hydrate();
    if (token) navigate('/dashboard', { replace: true });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
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
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-cebu-teal flex items-center justify-center p-4 transition-colors duration-200">
      {/* Dark mode toggle — top-right corner */}
      <button
        onClick={toggle}
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="fixed top-4 right-4 p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all duration-150 active:scale-90"
      >
        {dark
          ? <SunIcon  className="w-5 h-5" aria-hidden="true" />
          : <MoonIcon className="w-5 h-5" aria-hidden="true" />}
      </button>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in transition-colors duration-200">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3" role="img" aria-label="Beach emoji">🏖</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CebuSafeTour</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Admin Portal — Secure Login</p>
        </div>

        {/* Error alert */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-5 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor={emailId}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Email address
            </label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="admin@cebusafetour.ph"
              autoComplete="email"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label
              htmlFor={passwordId}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Password
            </label>
            <input
              id={passwordId}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              aria-required="true"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 text-base mt-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          CebuSafeTour © {new Date().getFullYear()} — Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}
