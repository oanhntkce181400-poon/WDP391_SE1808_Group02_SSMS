const pushTokenService = require('../services/pushToken.service');

async function register(req, res) {
  try {
    const userId = req.auth?.sub;
    const { token, platform, deviceName, appVersion } = req.body || {};

    const saved = await pushTokenService.registerPushToken({
      userId,
      token,
      platform,
      deviceName,
      appVersion,
    });

    return res.status(200).json({
      success: true,
      message: 'Push token registered.',
      data: saved,
    });
  } catch (error) {
    const status = String(error.message || '').toLowerCase().includes('required') ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to register push token.',
    });
  }
}

async function unregister(req, res) {
  try {
    const userId = req.auth?.sub;
    const { token } = req.body || {};

    const saved = await pushTokenService.unregisterPushToken({
      userId,
      token,
    });

    return res.status(200).json({
      success: true,
      message: 'Push token unregistered.',
      data: saved,
    });
  } catch (error) {
    const status = String(error.message || '').toLowerCase().includes('required') ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to unregister push token.',
    });
  }
}

module.exports = {
  register,
  unregister,
};
