const jwt = require('jsonwebtoken');
const {
  verifyGoogleIdToken,
} = require('../../external/google.provider');
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

module.exports = {
  loginWithGoogle,
  refreshTokens,
  logout,
  getMe,
};

