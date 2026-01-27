import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

function useGoogleClientId() {
  return useMemo(
    () => import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENTID,
    [],
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const clientId = useGoogleClientId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isSubmitting = isLocalSubmitting || isGoogleSubmitting;

  const handlePostLogin = useCallback(
    async ({ user, meta }) => {
      let nextUser = user || null;
      try {
        const meResponse = await authService.me();
        nextUser = meResponse?.data?.user || nextUser;
      } catch (err) {
        // Ignore and fallback to user from login response.
      }

      if (nextUser) {
        localStorage.setItem('auth_user', JSON.stringify(nextUser));
      }

      const mustChangePassword = Boolean(meta?.mustChangePassword || nextUser?.mustChangePassword);
      if (mustChangePassword && nextUser?.email) {
        const query = new URLSearchParams({ email: nextUser.email }).toString();
        navigate(`/reset-password?${query}`, { replace: true });
        return;
      }

      navigate('/dashboard', { replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    if (!clientId) {
      setErrorMessage('Missing VITE_GOOGLE_CLIENT_ID in frontend env.');
      return;
    }

    const google = window.google?.accounts?.id;
    if (!google || !googleButtonRef.current) {
      return;
    }

    google.initialize({
      client_id: clientId,
      callback: async (response) => {
        const idToken = response?.credential;
        if (!idToken) {
          setErrorMessage('Google login did not return an ID token.');
          return;
        }

        setIsGoogleSubmitting(true);
        setErrorMessage('');

        try {
          const loginResponse = await authService.loginWithGoogle(idToken);
          await handlePostLogin({
            user: loginResponse?.data?.user,
            meta: loginResponse?.data?.meta,
          });
        } catch (err) {
          const message =
            err?.response?.data?.message || err?.message || 'Login with Google failed.';
          setErrorMessage(message);
        } finally {
          setIsGoogleSubmitting(false);
        }
      },
    });

    google.renderButton(googleButtonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 320,
    });
  }, [clientId, handlePostLogin]);

  async function handleLocalLogin(event) {
    event.preventDefault();
    setIsLocalSubmitting(true);
    setErrorMessage('');

    try {
      const loginResponse = await authService.loginWithPassword(email, password);
      await handlePostLogin({
        user: loginResponse?.data?.user,
        meta: loginResponse?.data?.meta,
      });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Login failed.';
      setErrorMessage(message);
    } finally {
      setIsLocalSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#F0F7FF] to-[#E0E7FF]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-semibold text-white shadow-soft">
              SS
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Welcome Back</h1>
              <p className="mt-1 text-sm text-slate-500">Sign in to SchoolSys</p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Use Google SSO or a local account imported from the school system.
          </div>

          <form onSubmit={handleLocalLogin} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                placeholder="name@fpt.edu.vn"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Link
                  to={`/reset-password?${new URLSearchParams({ email }).toString()}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLocalSubmitting ? 'Signing you in...' : 'Sign in with password'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="flex flex-col items-center gap-4">
            <div ref={googleButtonRef} className="flex w-full justify-center" />

            <button
              type="button"
              onClick={() => window.google?.accounts?.id?.prompt()}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGoogleSubmitting ? 'Connecting to Google...' : 'Use another Google prompt'}
            </button>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-8 text-center text-sm text-slate-500">
            By continuing, you agree to SchoolSys policies.{' '}
            <a className="font-medium text-blue-600 hover:text-blue-700" href="#">
              Learn more
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
