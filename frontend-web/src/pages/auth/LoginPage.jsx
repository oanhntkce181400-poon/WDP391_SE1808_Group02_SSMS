import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

        setIsSubmitting(true);
        setErrorMessage('');

        try {
          await authService.loginWithGoogle(idToken);
          const meResponse = await authService.me();
          const user = meResponse?.data?.user;
          if (user) {
            localStorage.setItem('auth_user', JSON.stringify(user));
          }
          navigate('/dashboard', { replace: true });
        } catch (err) {
          const message =
            err?.response?.data?.message || err?.message || 'Login with Google failed.';
          setErrorMessage(message);
        } finally {
          setIsSubmitting(false);
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
  }, [clientId, navigate]);

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
              <p className="mt-1 text-sm text-slate-500">Sign in to SchoolSys with Google</p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Use your institutional Google account to access schedules, attendance, and role-based
            features.
          </div>

          <div className="flex flex-col items-center gap-4">
            <div ref={googleButtonRef} className="flex w-full justify-center" />

            <button
              type="button"
              onClick={() => window.google?.accounts?.id?.prompt()}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Signing you in...' : 'Try another Google prompt'}
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

