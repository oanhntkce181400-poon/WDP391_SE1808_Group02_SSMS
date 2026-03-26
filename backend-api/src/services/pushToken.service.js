const PushToken = require('../models/pushToken.model');

async function registerPushToken({ userId, token, platform, deviceName, appVersion }) {
  if (!userId) {
    throw new Error('User id is required.');
  }
  if (!token || !String(token).trim()) {
    throw new Error('Push token is required.');
  }

  const normalizedToken = String(token).trim();

  const saved = await PushToken.findOneAndUpdate(
    { token: normalizedToken },
    {
      user: userId,
      token: normalizedToken,
      platform: platform || 'unknown',
      deviceName: deviceName || '',
      appVersion: appVersion || '',
      provider: 'fcm',
      isActive: true,
      lastSeenAt: new Date(),
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return saved;
}

async function unregisterPushToken({ userId, token }) {
  if (!userId) {
    throw new Error('User id is required.');
  }
  if (!token || !String(token).trim()) {
    throw new Error('Push token is required.');
  }

  const normalizedToken = String(token).trim();

  const updated = await PushToken.findOneAndUpdate(
    { user: userId, token: normalizedToken },
    { isActive: false, lastSeenAt: new Date() },
    { new: true },
  );

  return updated;
}

async function getActiveTokensForUsers(userIds = []) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return [];
  }

  const rows = await PushToken.find({
    user: { $in: userIds },
    isActive: true,
  })
    .select('token user platform')
    .lean();

  return rows;
}

async function deactivateTokens(tokens = []) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return;
  }

  await PushToken.updateMany(
    { token: { $in: tokens } },
    { isActive: false, lastSeenAt: new Date() },
  );
}

module.exports = {
  registerPushToken,
  unregisterPushToken,
  getActiveTokensForUsers,
  deactivateTokens,
};
