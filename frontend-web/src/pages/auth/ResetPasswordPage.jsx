import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../../services/authService';

function useInitialEmail() {
  const [searchParams] = useSearchParams();
  return useMemo(() => searchParams.get('email') || '', [searchParams]);
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const initialEmail = useInitialEmail();

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSendOtp(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setErrorMessage('');

    try {
      await authService.forgotPassword(email);
      setOtpSent(true);
      setMessage('If the account exists, an OTP has been sent.');
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to send OTP.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setErrorMessage('');

    try {
      await authService.resetPassword(email, otp, newPassword);
      setMessage('Password reset successful. Please sign in again.');
      navigate('/login', { replace: true });
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to reset password.',
      );
    } finally {
      setIsSubmitting(false);
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
              <h1 className="text-2xl font-semibold text-slate-900">Reset Password</h1>
              <p className="mt-1 text-sm text-slate-500">Use OTP to set a new password</p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            This works for local accounts (typically imported from the school system).
          </div>

          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Sending OTP...' : otpSent ? 'Resend OTP' : 'Send OTP'}
            </button>
          </form>

          <form onSubmit={handleResetPassword} className="mt-6 flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">OTP Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                placeholder="Enter the 6-digit OTP"
                autoComplete="one-time-code"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                placeholder="Create a strong password"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Resetting...' : 'Reset password'}
            </button>
          </form>

          {message ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-8 text-center text-sm text-slate-500">
            <Link className="font-medium text-blue-600 hover:text-blue-700" to="/login">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

