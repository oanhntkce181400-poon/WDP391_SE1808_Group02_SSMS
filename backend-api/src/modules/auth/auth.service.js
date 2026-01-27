const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
  verifyGoogleIdToken,
} = require('../../external/google.provider');
const mailer = require('../../external/mailer');
const repo = require('./auth.repository');
const {
  generateId,
  hashToken,
  getRefreshTokenConfig,
  buildAccessTokenPayload,
  buildRefreshTokenPayload,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../../utils/token.util');

function extractRequestContext(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipFromForwarded = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim();

  return {
    ip: ipFromForwarded || req.ip || req.socket?.remoteAddress || '',
    userAgent: req.headers['user-agent'] || '',
  };
}

function buildRefreshExpiresAt() {
  const refreshCfg = getRefreshTokenConfig();
  return new Date(Date.now() + refreshCfg.cookieMaxAgeMs);
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function hashText(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('invalid-password-placeholder', PASSWORD_SALT_ROUNDS);

async function hashPassword(password) {
  return bcrypt.hash(String(password), PASSWORD_SALT_ROUNDS);
}

async function verifyPassword(password, passwordHash) {
  if (!passwordHash) {
    // Perform a dummy compare to make timing less revealing.
    await bcrypt.compare(String(password || ''), DUMMY_PASSWORD_HASH);
    return false;
  }
  return bcrypt.compare(String(password || ''), passwordHash);
}

function buildOtpExpiresAt() {
  const minutes = Number(process.env.OTP_EXPIRES_MINUTES || 10);
  return new Date(Date.now() + minutes * 60 * 1000);
}

function generateNumericOtp(length = 6) {
  const digits = [];
  for (let i = 0; i < length; i += 1) {
    digits.push(Math.floor(Math.random() * 10));
  }
  return digits.join('');
}

function sortByDateDesc(a, b) {
  const aTime = new Date(a).getTime();
  const bTime = new Date(b).getTime();
  return bTime - aTime;
}

function buildSessionsFromTokens(tokens, currentFamilyId) {
  const now = Date.now();
  const byFamily = new Map();

  tokens.forEach((token) => {
    if (!token?.familyId) return;
    if (!byFamily.has(token.familyId)) {
      byFamily.set(token.familyId, []);
    }
    byFamily.get(token.familyId).push(token);
  });

  const sessions = Array.from(byFamily.entries()).map(([familyId, familyTokens]) => {
    const sortedTokens = [...familyTokens].sort((a, b) =>
      sortByDateDesc(a.issuedAt || a.createdAt, b.issuedAt || b.createdAt),
    );

    const latest = sortedTokens[0];
    const deviceSession = latest?.deviceSession;
    const expiresAt = latest?.expiresAt ? new Date(latest.expiresAt).getTime() : 0;

    const isRevoked = Boolean(latest?.revokedAt);
    const isExpired = expiresAt > 0 ? expiresAt <= now : false;
    const isActive = !isRevoked && !isExpired;

    return {
      familyId,
      tokenCount: familyTokens.length,
      issuedAt: latest?.issuedAt || latest?.createdAt,
      lastUsedAt: latest?.lastUsedAt || latest?.updatedAt || latest?.createdAt,
      expiresAt: latest?.expiresAt,
      revokedAt: latest?.revokedAt || null,
      revokeReason: latest?.revokeReason || null,
      isActive,
      isCurrent: familyId === currentFamilyId,
      ipAddress: latest?.lastUsedIp || latest?.issuedIp || deviceSession?.ipAddress || null,
      userAgent:
        latest?.lastUsedUserAgent || latest?.issuedUserAgent || deviceSession?.userAgent || null,
      deviceSession: deviceSession
        ? {
            id: String(deviceSession._id || deviceSession.id),
            ipAddress: deviceSession.ipAddress,
            userAgent: deviceSession.userAgent,
            startedAt: deviceSession.startedAt,
            endedAt: deviceSession.endedAt,
            isActive: deviceSession.isActive,
          }
        : null,
    };
  });

  return sessions.sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return sortByDateDesc(a.lastUsedAt || a.issuedAt, b.lastUsedAt || b.issuedAt);
  });
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    authProvider: user.authProvider,
    status: user.status,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

async function upsertGoogleUser(googleProfile) {
  const { googleId, email, fullName, avatarUrl } = googleProfile;
  const defaultRole = process.env.DEFAULT_USER_ROLE || 'student';

  let user = await repo.findUserByGoogleId(googleId);

  if (!user && email) {
    user = await repo.findUserByEmail(email);
  }

  if (!user) {
    user = await repo.createUser({
      email,
      fullName: fullName || email,
      role: defaultRole,
      authProvider: 'google',
      googleId,
      avatarUrl,
      isActive: true,
      status: 'active',
      lastLoginAt: new Date(),
    });
    return user;
  }

  const updates = {
    authProvider: 'google',
    googleId,
    avatarUrl: avatarUrl || user.avatarUrl,
    fullName: fullName || user.fullName,
    lastLoginAt: new Date(),
  };

  return repo.updateUser(user._id, updates);
}

function issueTokenPair({ userId, role, familyId }) {
  const accessJti = generateId(16);
  const refreshJti = generateId(16);

  const accessToken = signAccessToken(
    buildAccessTokenPayload({ userId, role, familyId, jti: accessJti }),
  );

  const refreshToken = signRefreshToken(
    buildRefreshTokenPayload({ userId, familyId, jti: refreshJti }),
  );

  return {
    accessToken,
    refreshToken,
    accessJti,
    refreshJti,
  };
}

async function persistRefreshToken({
  userId,
  refreshToken,
  refreshJti,
  familyId,
  deviceSessionId,
  ip,
  userAgent,
}) {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = buildRefreshExpiresAt();

  return repo.createRefreshToken({
    user: userId,
    tokenHash,
    jti: refreshJti,
    familyId,
    expiresAt,
    issuedAt: new Date(),
    deviceSession: deviceSessionId,
    issuedIp: ip,
    issuedUserAgent: userAgent,
    lastUsedAt: new Date(),
    lastUsedIp: ip,
    lastUsedUserAgent: userAgent,
  });
}

async function recordLoginEvent({
  userId,
  deviceSessionId,
  ip,
  userAgent,
  familyId,
  accessJti,
  refreshJti,
  eventType,
  success,
  failureReason,
}) {
  return repo.createLoginEvent({
    user: userId,
    deviceSession: deviceSessionId,
    ipAddress: ip || 'unknown',
    userAgent,
    familyId,
    accessTokenJti: accessJti,
    refreshTokenJti: refreshJti,
    eventType,
    success,
    failureReason,
    occurredAt: new Date(),
  });
}

async function loginWithGoogle(req, { idToken }) {
  const { ip, userAgent } = extractRequestContext(req);

  const googleProfile = await verifyGoogleIdToken(idToken);
  if (!googleProfile.emailVerified) {
    throw new Error('Google email is not verified.');
  }

  const user = await upsertGoogleUser(googleProfile);

  const deviceSession = await repo.createDeviceSession({
    user: user._id,
    ipAddress: ip || 'unknown',
    userAgent,
    startedAt: new Date(),
    isActive: true,
  });

  const familyId = generateId(16);
  const { accessToken, refreshToken, accessJti, refreshJti } = issueTokenPair({
    userId: user._id,
    role: user.role,
    familyId,
  });

  const refreshDoc = await persistRefreshToken({
    userId: user._id,
    refreshToken,
    refreshJti,
    familyId,
    deviceSessionId: deviceSession._id,
    ip,
    userAgent,
  });

  await recordLoginEvent({
    userId: user._id,
    deviceSessionId: deviceSession._id,
    ip,
    userAgent,
    familyId,
    accessJti,
    refreshJti,
    eventType: 'login',
    success: true,
  });

  return {
    user: sanitizeUser(user),
    tokens: {
      accessToken,
      refreshToken,
    },
    meta: {
      familyId,
      refreshTokenId: String(refreshDoc._id),
      deviceSessionId: String(deviceSession._id),
    },
  };
}

async function loginWithPassword(req, { email, password }) {
  const { ip, userAgent } = extractRequestContext(req);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    throw new Error('email and password are required.');
  }

  const user = await repo.findUserByEmail(normalizedEmail);
  const isValidPassword = await verifyPassword(password, user?.password);

  if (!user || !isValidPassword) {
    await recordLoginEvent({
      userId: user?._id,
      ip,
      userAgent,
      eventType: 'login',
      success: false,
      failureReason: 'invalid-credentials',
    });
    throw new Error('Invalid credentials.');
  }

  if (user.status !== 'active' || user.isActive === false) {
    await recordLoginEvent({
      userId: user._id,
      ip,
      userAgent,
      eventType: 'login',
      success: false,
      failureReason: 'user-inactive',
    });
    throw new Error('User is inactive.');
  }

  const deviceSession = await repo.createDeviceSession({
    user: user._id,
    ipAddress: ip || 'unknown',
    userAgent,
    startedAt: new Date(),
    isActive: true,
  });

  const familyId = generateId(16);
  const { accessToken, refreshToken, accessJti, refreshJti } = issueTokenPair({
    userId: user._id,
    role: user.role,
    familyId,
  });

  const refreshDoc = await persistRefreshToken({
    userId: user._id,
    refreshToken,
    refreshJti,
    familyId,
    deviceSessionId: deviceSession._id,
    ip,
    userAgent,
  });

  await repo.updateUser(user._id, {
    lastLoginAt: new Date(),
  });

  await recordLoginEvent({
    userId: user._id,
    deviceSessionId: deviceSession._id,
    ip,
    userAgent,
    familyId,
    accessJti,
    refreshJti,
    eventType: 'login',
    success: true,
  });

  return {
    user: sanitizeUser(user),
    tokens: {
      accessToken,
      refreshToken,
    },
    meta: {
      familyId,
      refreshTokenId: String(refreshDoc._id),
      deviceSessionId: String(deviceSession._id),
      mustChangePassword: Boolean(user.mustChangePassword),
    },
  };
}

function safeDecodeRefreshToken(token) {
  try {
    return jwt.decode(token);
  } catch (err) {
    return null;
  }
}

async function refreshTokens(req, { refreshToken }) {
  const { ip, userAgent } = extractRequestContext(req);
  if (!refreshToken) {
    throw new Error('Missing refresh token.');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    const decoded = safeDecodeRefreshToken(refreshToken);
    if (decoded?.familyId) {
      await repo.revokeFamily(decoded.familyId, 'refresh-token-invalid');
    }
    throw err;
  }

  const tokenHash = hashToken(refreshToken);
  const tokenDoc = await repo.findRefreshTokenByHash(tokenHash);

  if (!tokenDoc) {
    if (payload?.familyId) {
      await repo.revokeFamily(payload.familyId, 'refresh-token-missing');
    }
    await recordLoginEvent({
      userId: payload?.sub,
      ip,
      userAgent,
      familyId: payload?.familyId,
      refreshJti: payload?.jti,
      eventType: 'refresh',
      success: false,
      failureReason: 'refresh-token-not-found',
    });
    throw new Error('Refresh token not found.');
  }

  if (tokenDoc.revokedAt) {
    await repo.revokeFamily(tokenDoc.familyId, 'refresh-token-reuse-detected');
    await recordLoginEvent({
      userId: tokenDoc.user,
      deviceSessionId: tokenDoc.deviceSession,
      ip,
      userAgent,
      familyId: tokenDoc.familyId,
      refreshJti: tokenDoc.jti,
      eventType: 'refresh',
      success: false,
      failureReason: 'refresh-token-reuse',
    });
    throw new Error('Refresh token reuse detected. Family revoked.');
  }

  await repo.touchRefreshTokenUsage(tokenDoc._id, { ip, userAgent });

  const user = await repo.findUserById(tokenDoc.user);
  if (!user || user.status !== 'active') {
    await repo.revokeFamily(tokenDoc.familyId, 'user-inactive');
    throw new Error('User is inactive or not found.');
  }

  const { accessToken, refreshToken: newRefreshToken, accessJti, refreshJti } = issueTokenPair(
    {
      userId: user._id,
      role: user.role,
      familyId: tokenDoc.familyId,
    },
  );

  const newRefreshDoc = await persistRefreshToken({
    userId: user._id,
    refreshToken: newRefreshToken,
    refreshJti,
    familyId: tokenDoc.familyId,
    deviceSessionId: tokenDoc.deviceSession,
    ip,
    userAgent,
  });

  await repo.revokeRefreshToken(tokenDoc._id, 'rotated', newRefreshDoc._id);

  await recordLoginEvent({
    userId: user._id,
    deviceSessionId: tokenDoc.deviceSession,
    ip,
    userAgent,
    familyId: tokenDoc.familyId,
    accessJti,
    refreshJti,
    eventType: 'refresh',
    success: true,
  });

  return {
    user: sanitizeUser(user),
    tokens: {
      accessToken,
      refreshToken: newRefreshToken,
    },
    meta: {
      familyId: tokenDoc.familyId,
      rotatedFrom: String(tokenDoc._id),
      rotatedTo: String(newRefreshDoc._id),
    },
  };
}

async function logout(req, { refreshToken }) {
  const { ip, userAgent } = extractRequestContext(req);
  if (!refreshToken) {
    return { success: true };
  }

  const payload = safeDecodeRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);
  const tokenDoc = await repo.findRefreshTokenByHash(tokenHash);

  if (tokenDoc?.familyId) {
    await repo.revokeFamily(tokenDoc.familyId, 'logout');
    await repo.endDeviceSession(tokenDoc.deviceSession);
  } else if (payload?.familyId) {
    await repo.revokeFamily(payload.familyId, 'logout-decode-only');
  }

  await recordLoginEvent({
    userId: tokenDoc?.user || payload?.sub,
    deviceSessionId: tokenDoc?.deviceSession,
    ip,
    userAgent,
    familyId: tokenDoc?.familyId || payload?.familyId,
    refreshJti: tokenDoc?.jti || payload?.jti,
    eventType: 'logout',
    success: true,
  });

  return { success: true };
}

async function getMe(req) {
  const userId = req.auth?.sub;
  const user = await repo.findUserById(userId);
  if (!user) {
    throw new Error('User not found.');
  }
  return sanitizeUser(user);
}

async function forgotPassword(req, { email }) {
  const { ip, userAgent } = extractRequestContext(req);
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  const user = await repo.findUserByEmail(normalizedEmail);

  // Do not reveal whether the account exists.
  if (!user) {
    return { success: true };
  }

  // Google-only accounts should reset via Google, not local OTP.
  if (user.authProvider === 'google' && !user.password) {
    return { success: true };
  }

  await repo.invalidateActiveOtps(user._id, 'forgot-password');

  const otp = generateNumericOtp(6);
  const otpHash = hashText(otp);
  const expiresAt = buildOtpExpiresAt();

  await repo.createPasswordResetOtp({
    user: user._id,
    email: normalizedEmail,
    otpHash,
    purpose: 'forgot-password',
    expiresAt,
    attempts: 0,
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
    requestIp: ip,
    requestUserAgent: userAgent,
  });

  await mailer.sendOtpMail(normalizedEmail, otp);

  await recordLoginEvent({
    userId: user._id,
    ip,
    userAgent,
    eventType: 'password-reset',
    success: true,
  });

  return { success: true };
}

async function resetPassword(req, { email, otp, newPassword }) {
  const { ip, userAgent } = extractRequestContext(req);
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !otp || !newPassword) {
    throw new Error('email, otp and newPassword are required.');
  }

  const user = await repo.findUserByEmail(normalizedEmail);
  if (!user) {
    throw new Error('Invalid reset request.');
  }

  if (user.authProvider === 'google' && !user.password) {
    throw new Error('This account uses Google login.');
  }

  const otpDoc = await repo.findLatestActiveOtp(user._id, 'forgot-password');
  if (!otpDoc) {
    throw new Error('OTP is invalid or expired.');
  }

  if (otpDoc.attempts >= otpDoc.maxAttempts) {
    await repo.consumeOtp(otpDoc._id);
    throw new Error('OTP attempt limit exceeded.');
  }

  const incomingHash = hashText(otp);
  if (incomingHash !== otpDoc.otpHash) {
    const updated = await repo.incrementOtpAttempts(otpDoc._id);
    if (updated && updated.attempts >= updated.maxAttempts) {
      await repo.consumeOtp(otpDoc._id);
    }
    throw new Error('OTP is invalid or expired.');
  }

  await repo.consumeOtp(otpDoc._id);

  // Store a hash rather than the raw password.
  const newPasswordHash = await hashPassword(newPassword);
  await repo.updateUser(user._id, {
    password: newPasswordHash,
    authProvider: 'local',
    mustChangePassword: false,
    passwordChangedAt: new Date(),
  });

  await recordLoginEvent({
    userId: user._id,
    ip,
    userAgent,
    eventType: 'password-reset',
    success: true,
  });

  return { success: true };
}

async function listMySessions(req) {
  const userId = req.auth?.sub;
  if (!userId) {
    throw new Error('Unauthorized.');
  }

  const tokens = await repo.listRefreshTokensByUser(userId);
  const sessions = buildSessionsFromTokens(tokens, req.auth?.familyId);
  return { sessions };
}

async function logoutAllSessions(req) {
  const { ip, userAgent } = extractRequestContext(req);
  const userId = req.auth?.sub;
  if (!userId) {
    throw new Error('Unauthorized.');
  }

  const tokens = await repo.listRefreshTokensByUser(userId);
  const sessions = buildSessionsFromTokens(tokens, req.auth?.familyId);

  const revokeResult = await repo.revokeAllFamiliesForUser(userId, 'logout-all');

  // End device sessions best-effort.
  const deviceSessionIds = tokens
    .map((t) => t?.deviceSession?._id || t?.deviceSession)
    .filter(Boolean);
  for (const deviceSessionId of deviceSessionIds) {
    // eslint-disable-next-line no-await-in-loop
    await repo.endDeviceSession(deviceSessionId);
  }

  await recordLoginEvent({
    userId,
    ip,
    userAgent,
    eventType: 'logout',
    success: true,
    failureReason: 'logout-all',
  });

  return {
    success: true,
    revokedFamilies: sessions.length,
    modifiedTokens: revokeResult?.modifiedCount || 0,
  };
}

async function revokeSession(req, { familyId }) {
  const { ip, userAgent } = extractRequestContext(req);
  const userId = req.auth?.sub;
  if (!userId) {
    throw new Error('Unauthorized.');
  }
  if (!familyId) {
    throw new Error('familyId is required.');
  }

  const tokens = await repo.listRefreshTokensByUser(userId);
  const tokensInFamily = tokens.filter((t) => t.familyId === familyId);
  if (tokensInFamily.length === 0) {
    throw new Error('Session not found.');
  }

  const revokeResult = await repo.revokeFamilyForUser(userId, familyId, 'session-revoked');

  const deviceSessionIds = tokensInFamily
    .map((t) => t?.deviceSession?._id || t?.deviceSession)
    .filter(Boolean);
  for (const deviceSessionId of deviceSessionIds) {
    // eslint-disable-next-line no-await-in-loop
    await repo.endDeviceSession(deviceSessionId);
  }

  await recordLoginEvent({
    userId,
    ip,
    userAgent,
    familyId,
    eventType: 'logout',
    success: true,
    failureReason: 'session-revoked',
  });

  return {
    success: true,
    modifiedTokens: revokeResult?.modifiedCount || 0,
    familyId,
  };
}

async function getMyLoginHistory(req, { limit }) {
  const userId = req.auth?.sub;
  if (!userId) {
    throw new Error('Unauthorized.');
  }

  const events = await repo.listLoginEventsByUser(userId, limit);
  return { events };
}

module.exports = {
  loginWithPassword,
  loginWithGoogle,
  refreshTokens,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  listMySessions,
  logoutAllSessions,
  revokeSession,
  getMyLoginHistory,
};
