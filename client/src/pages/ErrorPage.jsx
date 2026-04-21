import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPinIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useThemeStore } from '../store/themeStore';

const CONFIG = {
  404: {
    Icon: MapPinIcon,
    color: 'text-sky-500 dark:text-sky-400',
    bg:    'bg-sky-50 dark:bg-sky-900/20',
  },
  403: {
    Icon: ShieldExclamationIcon,
    color: 'text-amber-500 dark:text-amber-400',
    bg:    'bg-amber-50 dark:bg-amber-900/20',
  },
  500: {
    Icon: ExclamationTriangleIcon,
    color: 'text-red-500 dark:text-red-400',
    bg:    'bg-red-50 dark:bg-red-900/20',
  },
};

export default function ErrorPage({ code, title, message, fullScreen = true }) {
  const navigate   = useNavigate();
  const initTheme  = useThemeStore((s) => s.init);

  useEffect(() => { initTheme(); }, [initTheme]);

  const { Icon, color, bg } = CONFIG[code] ?? CONFIG[500];

  const card = (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-fade-in transition-colors duration-200">
      <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${bg} mb-6`}>
        <Icon className={`w-10 h-10 ${color}`} />
      </div>

      <p className={`text-8xl font-bold ${color} mb-2 leading-none`}>{code}</p>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mt-3 mb-2">{title}</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">{message}</p>

      <div className="flex gap-3 justify-center">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          Go Back
        </button>
        <button onClick={() => navigate('/dashboard', { replace: true })} className="btn-primary">
          Go to Dashboard
        </button>
      </div>
    </div>
  );

  if (!fullScreen) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        {card}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-cebu-teal flex items-center justify-center p-4 transition-colors duration-200">
      {card}
    </div>
  );
}
