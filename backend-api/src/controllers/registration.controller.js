const registrationService = require('../services/registration.service');
const Student = require('../models/student.model');

async function resolveStudentFromAuth(req) {
  const userId = req.auth?.sub;
  if (!userId) return null;

  let student = await Student.findOne({ userId });
  if (student) return student;

  const email = req.auth?.email;
  if (email) {
    student = await Student.findOne({ email: String(email).toLowerCase() });
  }

  return student;
}

const validatePrerequisites = async (req, res) => {
  try {
    const { classId } = req.body;
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: classId',
      });
    }

    const student = await resolveStudentFromAuth(req);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found for this user',
      });
    }

    const result = await registrationService.validatePrerequisites(student._id, classId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to validate prerequisites',
      error: error.message,
    });
  }
};

const validateClassCapacity = async (req, res) => {
  try {
    const { classId } = req.body;
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: classId',
      });
    }

    const result = await registrationService.validateClassCapacity(classId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to validate class capacity',
      error: error.message,
    });
  }
};

const validateWallet = async (req, res) => {
  try {
    const { classId } = req.body;
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: classId',
      });
    }

    const student = await resolveStudentFromAuth(req);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found for this user',
      });
    }

    const result = await registrationService.validateWallet(student._id, classId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to validate wallet balance',
      error: error.message,
    });
  }
};

const validateAll = async (req, res) => {
  try {
    const { classId } = req.body;
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: classId',
      });
    }

    const student = await resolveStudentFromAuth(req);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found for this user',
      });
    }

    const [prerequisitesResult, capacityResult, walletResult, eligibility] = await Promise.all([
      registrationService.validatePrerequisites(student._id, classId),
      registrationService.validateClassCapacity(classId),
      registrationService.validateWallet(student._id, classId),
      registrationService.getStudentEligibilitySummary(student._id, classId),
    ]);

    const isEligible =
      prerequisitesResult.eligible &&
      !capacityResult.isFull &&
      walletResult.isSufficient &&
      eligibility.canRegister;

    const validationErrors = [];
    if (!prerequisitesResult.eligible) validationErrors.push(prerequisitesResult.message);
    if (capacityResult.isFull) validationErrors.push(capacityResult.message);
    if (!walletResult.isSufficient) validationErrors.push(walletResult.message);
    if (!eligibility.limits.overload.allowed) validationErrors.push(eligibility.limits.overload.message);
    if (!eligibility.limits.credit.allowed) validationErrors.push(eligibility.limits.credit.message);
    if (!eligibility.limits.cohortAccess.allowed) validationErrors.push(eligibility.limits.cohortAccess.message);

    return res.status(200).json({
      success: true,
      message: isEligible ? 'Eligible for registration' : 'Not eligible for registration',
      data: {
        isEligible,
        prerequisites: prerequisitesResult,
        capacity: capacityResult,
        wallet: walletResult,
        overload: eligibility.limits.overload,
        credit: eligibility.limits.credit,
        cohortAccess: eligibility.limits.cohortAccess,
        eligibility,
        validationErrors,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to validate registration',
      error: error.message,
    });
  }
};

const getEligibilitySummary = async (req, res) => {
  try {
    const student = await resolveStudentFromAuth(req);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found for this user',
      });
    }

    const data = await registrationService.getStudentEligibilitySummary(
      student._id,
      req.query.classId || null,
    );

    return res.status(200).json({
      success: true,
      message: 'Eligibility summary loaded successfully',
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load eligibility summary',
      error: error.message,
    });
  }
};

module.exports = {
  validatePrerequisites,
  validateClassCapacity,
  validateWallet,
  validateAll,
  getEligibilitySummary,
};
