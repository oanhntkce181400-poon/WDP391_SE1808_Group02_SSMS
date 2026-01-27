const authService = require('./auth.service');
const {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenConfig,
} = require('../../utils/token.util');

function handleError(res, err, fallbackMessage) {
  const message = err?.message || fallbackMessage;
  return res.status(401).json({
    message,
  });
}

async function googleLogin(req, res) {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ message: 'idToken is required.' });
    }

    const result = await authService.loginWithGoogle(req, { idToken });
    setAuthCookies(res, result.tokens);

    return res.json({
      message: 'Login with Google successful.',
      user: result.user,
      meta: result.meta,
    });
  } catch (err) {
    return handleError(res, err, 'Google login failed.');
  }
}

async function passwordLogin(req, res) {
  try {
    const { email, password } = req.body || {};
    const result = await authService.loginWithPassword(req, { email, password });
    setAuthCookies(res, result.tokens);

    return res.json({
      message: 'Login successful.',
      user: result.user,
      meta: result.meta,
    });
  } catch (err) {
    const message = err?.message || 'Login failed.';
    const status = message.toLowerCase().includes('required') ? 400 : 401;
    return res.status(status).json({ message });
  }
}

async function refresh(req, res) {
  const refreshCookieName = getRefreshTokenConfig().cookieName;
  const refreshToken = req.cookies?.[refreshCookieName];

  try {
    const result = await authService.refreshTokens(req, { refreshToken });
    setAuthCookies(res, result.tokens);

    return res.json({
      message: 'Token refreshed.',
      user: result.user,
      meta: result.meta,
    });
  } catch (err) {
    clearAuthCookies(res);
    return handleError(res, err, 'Refresh token failed.');
  }
}

async function logout(req, res) {
  const refreshCookieName = getRefreshTokenConfig().cookieName;
  const refreshToken = req.cookies?.[refreshCookieName];

  try {
    await authService.logout(req, { refreshToken });
    clearAuthCookies(res);
    return res.json({ message: 'Logged out.' });
  } catch (err) {
    clearAuthCookies(res);
    return res.status(500).json({ message: err.message || 'Logout failed.' });
  }
}

async function me(req, res) {
  try {
    const user = await authService.getMe(req);
    return res.json({ user });
  } catch (err) {
    return res.status(401).json({ message: err.message || 'Unauthorized.' });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    await authService.forgotPassword(req, { email });
    return res.json({
      message: 'If the account exists, an OTP has been sent.',
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Forgot password failed.' });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body || {};
    await authService.resetPassword(req, { email, otp, newPassword });
    return res.json({ message: 'Password has been reset.' });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Reset password failed.' });
  }
}

async function sessions(req, res) {
  try {
    const result = await authService.listMySessions(req);
    return res.json(result);
  } catch (err) {
    return res.status(401).json({ message: err.message || 'Failed to load sessions.' });
  }
}

async function logoutAllSessions(req, res) {
  try {
    const result = await authService.logoutAllSessions(req);
    clearAuthCookies(res);
    return res.json({
      message: 'All sessions have been revoked.',
      ...result,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Logout all sessions failed.' });
  }
}

async function revokeSession(req, res) {
  try {
    const { familyId } = req.params;
    const result = await authService.revokeSession(req, { familyId });

    if (familyId && req.auth?.familyId === familyId) {
      clearAuthCookies(res);
    }

    return res.json({
      message: 'Session revoked.',
      ...result,
    });
  } catch (err) {
    const status = String(err.message || '').toLowerCase().includes('not found') ? 404 : 400;
    return res.status(status).json({ message: err.message || 'Revoke session failed.' });
  }
}

async function loginHistory(req, res) {
  try {
    const { limit } = req.query || {};
    const result = await authService.getMyLoginHistory(req, { limit });
    return res.json(result);
  } catch (err) {
    return res.status(401).json({ message: err.message || 'Failed to load login history.' });
  }
}

module.exports = {
  passwordLogin,
  googleLogin,
  refresh,
  logout,
  me,
  forgotPassword,
  resetPassword,
  sessions,
  logoutAllSessions,
  revokeSession,
  loginHistory,
};
