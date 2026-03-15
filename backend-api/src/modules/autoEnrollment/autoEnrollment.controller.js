const service = require('./autoEnrollment.service');

function normalizeCodeList(value) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => String(item || '').trim().toUpperCase())
          .filter(Boolean),
      ),
    );
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(/[\s,;\n]+/)
          .map((item) => item.trim().toUpperCase())
          .filter(Boolean),
      ),
    );
  }

  return [];
}

async function trigger(req, res) {
  try {
    const {
      semesterId,
      dryRun,
      limit,
      majorCodes,
      studentCodes,
      onlyStudentsWithoutEnrollments,
    } = req.body || {};
    if (!semesterId) {
      return res.status(400).json({
        success: false,
        message: 'semesterId is required',
      });
    }

    const result = await service.triggerAutoEnrollment(semesterId, {
      dryRun: dryRun === true,
      limit: Number.isInteger(Number(limit)) ? Number(limit) : undefined,
      majorCodes: normalizeCodeList(majorCodes),
      studentCodes: normalizeCodeList(studentCodes),
      onlyStudentsWithoutEnrollments: onlyStudentsWithoutEnrollments === true,
    });

    return res.status(200).json({
      success: true,
      message: dryRun === true ? 'Auto enrollment dry run completed' : 'Auto enrollment completed',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to trigger auto enrollment',
    });
  }
}

module.exports = {
  trigger,
};
