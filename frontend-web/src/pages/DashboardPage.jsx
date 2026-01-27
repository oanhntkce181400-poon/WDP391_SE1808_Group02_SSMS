import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    authService
      .me()
      .then((res) => {
        if (!isMounted) return;
        const nextUser = res?.data?.user || null;
        setUser(nextUser);
        if (nextUser) {
          localStorage.setItem('auth_user', JSON.stringify(nextUser));
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const message = err?.response?.data?.message || err?.message || 'Failed to load profile.';
        setErrorMessage(message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('auth_user');
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Authenticated via Google and cookies</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            Logout
          </button>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5">
          {isLoading ? <p className="text-slate-600">Loading profile...</p> : null}

          {!isLoading && user ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Full name" value={user.fullName} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Role" value={user.role} />
              <InfoRow label="Provider" value={user.authProvider} />
              <InfoRow label="Status" value={user.status} />
              <InfoRow label="User ID" value={user.id} />
            </div>
          ) : null}

          {!isLoading && !user && errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value || '-'}</div>
    </div>
  );
}

