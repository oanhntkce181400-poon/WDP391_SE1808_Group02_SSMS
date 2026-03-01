const registrationService = require('../services/registration.service');
const Student = require('../models/student.model');

/**
 * UC43 - Validate Prerequisites
 * POST /api/registrations/validate
 * Body: { classId }
 */
const validatePrerequisites = async (req, res) => {
  try {
    const { classId } = req.body;
    const userId = req.user?.userId || req.user?._id;

    // Validate input
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: classId',
      });
    }

    // Find student by userId
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found for this user',
      });
    }

    // Validate prerequisites
    const result = await registrationService.validatePrerequisites(student._id, classId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error('Error validating prerequisites:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate prerequisites',
      error: error.message,
    });
  }
};

/**
 * UC40 - Validate Class Capacity
 * POST /api/registrations/validate-capacity
 * Body: { classId }
 */
const validateClassCapacity = async (req, res) => {
  try {
    const { classId } = req.body;

    // Validate input
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: classId',
      });
    }

    // Validate capacity
    const result = await registrationService.validateClassCapacity(classId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error('Error validating class capacity:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate class capacity',
      error: error.message,
    });
  }
};

/**
 * UC33 - Validate Wallet
 * POST /api/registrations/validate-wallet
 * Body: { classId }
 */
const validateWallet = async (req, res) => {
  try {
    const { classId } = req.body;
    const userId = req.user?.userId || req.user?._id;

    // Validate input
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: classId',
      });
    }

    // Find student by userId
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found for this user',
      });
    }

    // Validate wallet balance
    const result = await registrationService.validateWallet(student._id, classId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error('Error validating wallet:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate wallet balance',
      error: error.message,
    });
  }
};

/**
 * Combined validation endpoint
 * POST /api/registrations/validate-all
 * Body: { classId }
 * Validates prerequisites, capacity, and wallet in one call
 */
const validateAll = async (req, res) => {
  try {
    const { classId } = req.body;
    const userId = req.user?.userId || req.user?._id;

    // Validate input
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: classId',
      });
    }

    // Find student by userId
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found for this user',
      });
    }

    const studentId = student._id;

    // Run all validations
    const [prerequisitesResult, capacityResult, walletResult] = await Promise.all([
      registrationService.validatePrerequisites(studentId, classId),
      registrationService.validateClassCapacity(classId),
      registrationService.validateWallet(studentId, classId),
    ]);

    // Determine overall eligibility
    const isEligible =
      prerequisitesResult.eligible && !capacityResult.isFull && walletResult.isSufficient;

    const validationErrors = [];
    if (!prerequisitesResult.eligible) {
      validationErrors.push(prerequisitesResult.message);
    }
    if (capacityResult.isFull) {
      validationErrors.push(capacityResult.message);
    }
    if (!walletResult.isSufficient) {
      validationErrors.push(walletResult.message);
    }

    return res.status(200).json({
      success: true,
      message: isEligible ? 'Eligible for registration' : 'Not eligible for registration',
      data: {
        isEligible,
        prerequisites: prerequisitesResult,
        capacity: capacityResult,
        wallet: walletResult,
        validationErrors,
      },
    });
  } catch (error) {
    console.error('Error validating registration:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate registration',
      error: error.message,
    });
  }
};

module.exports = {
  validatePrerequisites,
  validateClassCapacity,
  validateWallet,
  validateAll,
};
