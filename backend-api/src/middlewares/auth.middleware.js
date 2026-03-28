const {
  verifyAccessToken,
  getAccessTokenConfig,
} = require('../utils/token.util');
const User = require('../models/user.model');
const { normalizeRole } = require('../utils/role.util');

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return null;
  return token;
}

function isTokenIssuedBeforePasswordChange(payload, passwordChangedAt) {
  if (!payload?.iat || !passwordChangedAt) return false;
  const tokenIssuedAtSeconds = Number(payload.iat) || 0;
  const passwordChangedAtSeconds = Math.floor(new Date(passwordChangedAt).getTime() / 1000);
  return passwordChangedAtSeconds > tokenIssuedAtSeconds;
}

module.exports = async function authMiddleware(req, res, next) {
  try {
    const accessCookieName = getAccessTokenConfig().cookieName;
    const tokenFromCookie = req.cookies?.[accessCookieName];
    const token = tokenFromCookie || extractBearerToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Missing access token.' });
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload?.sub)
      .select('role status isActive passwordChangedAt')
      .lean();

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    if (user.status !== 'active' || user.isActive === false) {
      return res.status(401).json({ message: 'User is inactive.' });
    }

    if (isTokenIssuedBeforePasswordChange(payload, user.passwordChangedAt)) {
      return res.status(401).json({ message: 'Access token is no longer valid.' });
    }

    req.auth = {
      ...payload,
      role: normalizeRole(user.role, payload?.role),
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: err.message || 'Invalid access token.' });
  }
};
