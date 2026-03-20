import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  // In dev, Vite proxies '/api' to localhost:5000.
  // In production (Hostinger), set VITE_API_URL=https://yourdomain.com in .env.production.
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15000,
});

// Attach stored token on every request (survives page refresh)
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('cebusafetour-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
    }
  } catch {}
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || 'Something went wrong';
    if (err.response?.status === 401) {
      localStorage.removeItem('cebusafetour-auth');
      window.location.href = '/login';
    } else if (!err.config?.skipToast) {
      // Components can pass { skipToast: true } to handle their own error display
      toast.error(msg);
    }
    return Promise.reject(err);
  }
);

export default api;
