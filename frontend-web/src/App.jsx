import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import authService from './services/authService';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let isMounted = true;
    authService
      .me()
      .then(() => {
        if (isMounted) setStatus('authenticated');
      })
      .catch(() => {
        if (isMounted) setStatus('unauthenticated');
      });

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm font-medium text-slate-700 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5">
          Checking session...
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
