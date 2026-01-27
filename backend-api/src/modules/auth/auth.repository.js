const User = require('../../models/user.model');
const RefreshToken = require('../../models/refreshToken.model');
const DeviceSession = require('../../models/deviceSession.model');
const LoginEvent = require('../../models/loginEvent.model');
const PasswordResetOtp = require('../../models/passwordResetOtp.model');

async function findUserByGoogleId(googleId) {
  if (!googleId) return null;
  return User.findOne({ googleId });
}

async function findUserByEmail(email) {
  if (!email) return null;
  return User.findOne({ email: email.toLowerCase().trim() });
}

async function createUser(data) {
  return User.create(data);
}

async function updateUser(userId, updates) {
  return User.findByIdAndUpdate(userId, updates, { new: true });
}

async function createDeviceSession(data) {
  return DeviceSession.create(data);
}

async function endDeviceSession(sessionId) {
  if (!sessionId) return null;
  return DeviceSession.findByIdAndUpdate(
    sessionId,
    { endedAt: new Date(), isActive: false },
    { new: true },
  );
}

async function createRefreshToken(data) {
  return RefreshToken.create(data);
}

async function findRefreshTokenByHash(tokenHash) {
  if (!tokenHash) return null;
  return RefreshToken.findOne({ tokenHash });
}

async function updateRefreshToken(tokenId, updates) {
  return RefreshToken.findByIdAndUpdate(tokenId, updates, { new: true });
}

async function revokeRefreshToken(tokenId, reason, replacedByTokenId) {
  const updates = {
    revokedAt: new Date(),
    revokeReason: reason,
  };

  if (replacedByTokenId) {
    updates.replacedByToken = replacedByTokenId;
  }

  return updateRefreshToken(tokenId, updates);
}

async function revokeFamily(familyId, reason) {
  if (!familyId) return { modifiedCount: 0 };
  return RefreshToken.updateMany(
    {
      familyId,
      $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }],
    },
    {
      $set: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    },
  );
}

async function touchRefreshTokenUsage(tokenId, { ip, userAgent }) {
  if (!tokenId) return null;
  return updateRefreshToken(tokenId, {
    lastUsedAt: new Date(),
    lastUsedIp: ip,
    lastUsedUserAgent: userAgent,
  });
}

async function createLoginEvent(data) {
  return LoginEvent.create(data);
}

async function findUserById(userId) {
  if (!userId) return null;
  return User.findById(userId);
}

async function listRefreshTokensByUser(userId) {
  if (!userId) return [];
  return RefreshToken.find({ user: userId })
    .populate('deviceSession')
    .sort({ createdAt: -1 })
    .lean();
}

async function revokeAllFamiliesForUser(userId, reason = 'logout-all') {
  if (!userId) return { modifiedCount: 0 };
  return RefreshToken.updateMany(
    {
      user: userId,
      $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }],
    },
    {
      $set: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    },
  );
}

async function revokeFamilyForUser(userId, familyId, reason = 'session-revoked') {
  if (!userId || !familyId) return { modifiedCount: 0 };
  return RefreshToken.updateMany(
    {
      user: userId,
      familyId,
      $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }],
    },
    {
      $set: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    },
  );
}

async function listLoginEventsByUser(userId, limit = 50) {
  if (!userId) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  return LoginEvent.find({ user: userId })
    .sort({ occurredAt: -1, createdAt: -1 })
    .limit(safeLimit)
    .lean();
}

async function invalidateActiveOtps(userId, purpose = 'forgot-password') {
  if (!userId) return { modifiedCount: 0 };
  return PasswordResetOtp.updateMany(
    {
      user: userId,
      purpose,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        consumedAt: new Date(),
      },
    },
  );
}

async function createPasswordResetOtp(data) {
  return PasswordResetOtp.create(data);
}

async function findLatestActiveOtp(userId, purpose = 'forgot-password') {
  if (!userId) return null;
  return PasswordResetOtp.findOne({
    user: userId,
    purpose,
    consumedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
}

async function incrementOtpAttempts(otpId) {
  if (!otpId) return null;
  return PasswordResetOtp.findByIdAndUpdate(
    otpId,
    { $inc: { attempts: 1 } },
    { new: true },
  ).lean();
}

async function consumeOtp(otpId) {
  if (!otpId) return null;
  return PasswordResetOtp.findByIdAndUpdate(
    otpId,
    { consumedAt: new Date() },
    { new: true },
  ).lean();
}

module.exports = {
  findUserByGoogleId,
  findUserByEmail,
  createUser,
  updateUser,
  createDeviceSession,
  endDeviceSession,
  createRefreshToken,
  findRefreshTokenByHash,
  updateRefreshToken,
  revokeRefreshToken,
  revokeFamily,
  touchRefreshTokenUsage,
  createLoginEvent,
  findUserById,
  listRefreshTokensByUser,
  revokeAllFamiliesForUser,
  revokeFamilyForUser,
  listLoginEventsByUser,
  invalidateActiveOtps,
  createPasswordResetOtp,
  findLatestActiveOtp,
  incrementOtpAttempts,
  consumeOtp,
};
