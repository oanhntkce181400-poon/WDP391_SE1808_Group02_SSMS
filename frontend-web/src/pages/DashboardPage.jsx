import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function statusPillClass(isActive) {
  return isActive
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : 'bg-slate-100 text-slate-600 ring-slate-200';
}

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

  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [sessions, setSessions] = useState([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState('');

  const [history, setHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const [actionState, setActionState] = useState({ type: '', familyId: '' });

  const currentSession = useMemo(() => sessions.find((s) => s.isCurrent), [sessions]);

  const loadProfile = useCallback(async () => {
    setIsProfileLoading(true);
    setProfileError('');
    try {
      const res = await authService.me();
      const nextUser = res?.data?.user || null;
      setUser(nextUser);
      if (nextUser) {
        localStorage.setItem('auth_user', JSON.stringify(nextUser));
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load profile.';
      setProfileError(message);
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setIsSessionsLoading(true);
    setSessionsError('');
    try {
      const res = await authService.getSessions();
      setSessions(res?.data?.sessions || []);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load sessions.';
      setSessionsError(message);
    } finally {
      setIsSessionsLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await authService.getLoginHistory(50);
      setHistory(res?.data?.events || []);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load login history.';
      setHistoryError(message);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadProfile(), loadSessions(), loadHistory()]);
  }, [loadHistory, loadProfile, loadSessions]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleLogout() {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('auth_user');
      navigate('/login', { replace: true });
    }
  }

  async function handleLogoutAllSessions() {
    setActionState({ type: 'logout-all', familyId: '' });
    try {
      await authService.logoutAllSessions();
      localStorage.removeItem('auth_user');
      navigate('/login', { replace: true });
    } catch (err) {
      setSessionsError(err?.response?.data?.message || err?.message || 'Logout all failed.');
    } finally {
      setActionState({ type: '', familyId: '' });
    }
  }

  async function handleRevokeSession(session) {
    if (!session?.familyId) return;
    setActionState({ type: 'revoke', familyId: session.familyId });
    try {
      await authService.revokeSession(session.familyId);
      if (session.isCurrent) {
        localStorage.removeItem('auth_user');
        navigate('/login', { replace: true });
        return;
      }
      await Promise.all([loadSessions(), loadHistory()]);
    } catch (err) {
      setSessionsError(err?.response?.data?.message || err?.message || 'Revoke session failed.');
    } finally {
      setActionState({ type: '', familyId: '' });
    }
  }

  const isBusy = actionState.type !== '';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Session security, device history, and account visibility
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadAll}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5">
          {isProfileLoading ? <p className="text-slate-600">Loading profile...</p> : null}

          {!isProfileLoading && user ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Full name" value={user.fullName} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Role" value={user.role} />
              <InfoRow label="Provider" value={user.authProvider} />
              <InfoRow label="Status" value={user.status} />
              <InfoRow label="User ID" value={user.id} />
            </div>
          ) : null}

          {!isProfileLoading && !user && profileError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileError}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Sessions & Devices</h2>
              <p className="text-sm text-slate-500">
                Manage active sessions and revoke suspicious devices
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogoutAllSessions}
              disabled={isBusy || sessions.length === 0}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionState.type === 'logout-all' ? 'Revoking...' : 'Logout all sessions'}
            </button>
          </div>

          {currentSession ? (
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
              Current session: {formatDateTime(currentSession.lastUsedAt)} · {currentSession.ipAddress || '-'}
            </div>
          ) : null}

          {isSessionsLoading ? <p className="text-slate-600">Loading sessions...</p> : null}

          {!isSessionsLoading && sessionsError ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {sessionsError}
            </div>
          ) : null}

          {!isSessionsLoading && sessions.length === 0 && !sessionsError ? (
            <p className="text-sm text-slate-500">No session data yet.</p>
          ) : null}

          {sessions.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <div className="col-span-4">Device</div>
                <div className="col-span-3">Last used</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-2 text-right">Action</div>
              </div>

              <div className="divide-y divide-slate-200">
                {sessions.map((session) => {
                  const isRowBusy = actionState.type === 'revoke' && actionState.familyId === session.familyId;
                  return (
                    <div
                      key={session.familyId}
                      className="grid grid-cols-12 gap-2 px-4 py-4 text-sm text-slate-700"
                    >
                      <div className="col-span-4 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-slate-900" title={session.userAgent || ''}>
                            {session.userAgent || 'Unknown device'}
                          </span>
                          {session.isCurrent ? (
                            <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                              Current
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {session.ipAddress || '-'} · tokens: {session.tokenCount}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-400">
                          familyId: {session.familyId}
                        </div>
                      </div>

                      <div className="col-span-3">
                        <div className="font-medium text-slate-900">
                          {formatDateTime(session.lastUsedAt)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Expires: {formatDateTime(session.expiresAt)}
                        </div>
                      </div>

                      <div className="col-span-3 flex items-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusPillClass(
                            session.isActive,
                          )}`}
                        >
                          {session.isActive ? 'Active' : 'Revoked / Expired'}
                        </span>
                      </div>

                      <div className="col-span-2 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(session)}
                          disabled={isBusy || isRowBusy}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isRowBusy ? 'Revoking...' : session.isCurrent ? 'Logout' : 'Revoke'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Login History</h2>
            <p className="text-sm text-slate-500">Recent authentication events for your account</p>
          </div>

          {isHistoryLoading ? <p className="text-slate-600">Loading history...</p> : null}

          {!isHistoryLoading && historyError ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {historyError}
            </div>
          ) : null}

          {!isHistoryLoading && history.length === 0 && !historyError ? (
            <p className="text-sm text-slate-500">No login events yet.</p>
          ) : null}

          {history.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <div className="col-span-3">Time</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Result</div>
                <div className="col-span-2">IP</div>
                <div className="col-span-3">User agent</div>
              </div>

              <div className="divide-y divide-slate-200">
                {history.map((event) => (
                  <div
                    key={event._id || `${event.eventType}-${event.occurredAt}`}
                    className="grid grid-cols-12 gap-2 px-4 py-4 text-sm text-slate-700"
                  >
                    <div className="col-span-3 font-medium text-slate-900">
                      {formatDateTime(event.occurredAt || event.createdAt)}
                    </div>
                    <div className="col-span-2 capitalize">{event.eventType || '-'}</div>
                    <div className="col-span-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusPillClass(
                          event.success,
                        )}`}
                      >
                        {event.success ? 'Success' : 'Failed'}
                      </span>
                      {event.failureReason ? (
                        <div className="mt-1 text-xs text-slate-500">{event.failureReason}</div>
                      ) : null}
                    </div>
                    <div className="col-span-2 truncate">{event.ipAddress || '-'}</div>
                    <div className="col-span-3 truncate" title={event.userAgent || ''}>
                      {event.userAgent || '-'}
                    </div>
                  </div>
                ))}
              </div>
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
