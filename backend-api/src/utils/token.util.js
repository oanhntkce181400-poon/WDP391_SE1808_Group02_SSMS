const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || 'at';
const REFRESH_TOKEN_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'rt';

function parseDurationToMs(value, fallbackMs) {
  if (!value || typeof value !== 'string') return fallbackMs;
  const match = value.trim().match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const unitToMs = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * unitToMs[unit];
}

function generateId(size = 32) {
  return crypto.randomBytes(size).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getAccessTokenConfig() {
  return {
    secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    cookieName: ACCESS_TOKEN_COOKIE_NAME,
    cookieMaxAgeMs: parseDurationToMs(process.env.JWT_ACCESS_EXPIRES_IN || '15m', 15 * 60 * 1000),
  };
}

function getRefreshTokenConfig() {
  return {
    secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    cookieName: REFRESH_TOKEN_COOKIE_NAME,
    cookieMaxAgeMs: parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d', 7 * 24 * 60 * 60 * 1000),
  };
}

function buildAccessTokenPayload({ userId, role, familyId, jti }) {
  return {
    sub: String(userId),
    role,
    familyId,
    jti,
    type: 'access',
  };
}

function buildRefreshTokenPayload({ userId, familyId, jti }) {
  return {
    sub: String(userId),
    familyId,
    jti,
    type: 'refresh',
  };
}

function signAccessToken(payload) {
  const { secret, expiresIn } = getAccessTokenConfig();
  return jwt.sign(payload, secret, { expiresIn });
}

function signRefreshToken(payload) {
  const { secret, expiresIn } = getRefreshTokenConfig();
  return jwt.sign(payload, secret, { expiresIn });
}

function verifyAccessToken(token) {
  const { secret } = getAccessTokenConfig();
  return jwt.verify(token, secret);
}

function verifyRefreshToken(token) {
  const { secret } = getRefreshTokenConfig();
  return jwt.verify(token, secret);
}

function buildCookieOptions(maxAgeMs) {
  const isSecure = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true';
  const sameSite = process.env.COOKIE_SAME_SITE || 'lax';

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite,
    maxAge: maxAgeMs,
    path: '/',
  };
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  const accessCfg = getAccessTokenConfig();
  const refreshCfg = getRefreshTokenConfig();

  res.cookie(
    accessCfg.cookieName,
    accessToken,
    buildCookieOptions(accessCfg.cookieMaxAgeMs),
  );

  res.cookie(
    refreshCfg.cookieName,
    refreshToken,
    buildCookieOptions(refreshCfg.cookieMaxAgeMs),
  );
}

function clearAuthCookies(res) {
  const accessCfg = getAccessTokenConfig();
  const refreshCfg = getRefreshTokenConfig();

  res.clearCookie(accessCfg.cookieName, { path: '/' });
  res.clearCookie(refreshCfg.cookieName, { path: '/' });
}

module.exports = {
  generateId,
  hashToken,
  getAccessTokenConfig,
  getRefreshTokenConfig,
  buildAccessTokenPayload,
  buildRefreshTokenPayload,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
};

