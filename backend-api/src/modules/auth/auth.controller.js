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

module.exports = {
  googleLogin,
  refresh,
  logout,
  me,
};

