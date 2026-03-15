const service = require('./teachingSchedule.service');

async function getTeachingSchedule(req, res) {
  try {
    const userId = req.auth?.sub;
    const data = await service.getTeachingSchedule(userId, req.query || {});

    return res.status(200).json({
      success: true,
      message: 'Teaching schedule loaded successfully',
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to load teaching schedule',
    });
  }
}

module.exports = {
  getTeachingSchedule,
};
