const {
  verifyAccessToken,
  getAccessTokenConfig,
} = require('../utils/token.util');

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return null;
  return token;
}

module.exports = function authMiddleware(req, res, next) {
  try {
    const accessCookieName = getAccessTokenConfig().cookieName;
    const tokenFromCookie = req.cookies?.[accessCookieName];
    const token = tokenFromCookie || extractBearerToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Missing access token.' });
    }

    const payload = verifyAccessToken(token);
    req.auth = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: err.message || 'Invalid access token.' });
  }
};
