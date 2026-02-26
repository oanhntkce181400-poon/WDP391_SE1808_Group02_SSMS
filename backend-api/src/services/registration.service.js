const ClassSection = require('../models/classSection.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const Subject = require('../models/subject.model');
const Wallet = require('../models/wallet.model');
const Student = require('../models/student.model');

/**
 * UC43 - Validate Prerequisites
 * Kiểm tra sinh viên đã hoàn thành các môn tiên quyết chưa
 */
const validatePrerequisites = async (studentId, classId) => {
  try {
    // 1. Lấy thông tin class và subject
    const classSection = await ClassSection.findById(classId)
      .populate('subject')
      .exec();

    if (!classSection) {
      return {
        eligible: false,
        message: 'Class not found',
      };
    }

    const subject = classSection.subject;

    // 2. Kiểm tra nếu môn không có prerequisites
    if (!subject.prerequisites || subject.prerequisites.length === 0) {
      return {
        eligible: true,
        message: 'No prerequisites required',
      };
    }

    // 3. Lấy danh sách môn đã hoàn thành của sinh viên (grade >= 5.0 và status = 'completed')
    const completedEnrollments = await ClassEnrollment.find({
      student: studentId,
      status: 'completed',
      grade: { $gte: 5.0 },
    })
      .populate({
        path: 'classSection',
        populate: { path: 'subject' },
      })
      .exec();

    // 4. Lấy danh sách subjectCode đã pass
    const passedSubjectCodes = completedEnrollments
      .map((enrollment) => enrollment.classSection?.subject?.subjectCode)
      .filter(Boolean);

    // 5. Kiểm tra từng prerequisite
    const missingPrerequisites = [];
    for (const prereq of subject.prerequisites) {
      if (!passedSubjectCodes.includes(prereq.code)) {
        missingPrerequisites.push(prereq);
      }
    }

    // 6. Return result
    if (missingPrerequisites.length > 0) {
      return {
        eligible: false,
        message: `Chưa qua môn tiên quyết: ${missingPrerequisites.map((p) => p.name).join(', ')}`,
        missingPrerequisites,
      };
    }

    return {
      eligible: true,
      message: 'All prerequisites passed',
    };
  } catch (error) {
    console.error('Error validating prerequisites:', error);
    throw error;
  }
};

/**
 * UC40 - Validate Class Capacity
 * Kiểm tra lớp còn chỗ trống không
 */
const validateClassCapacity = async (classId) => {
  try {
    // 1. Lấy thông tin lớp
    const classSection = await ClassSection.findById(classId).exec();

    if (!classSection) {
      return {
        isFull: true,
        message: 'Class not found',
      };
    }

    // 2. Kiểm tra capacity
    const isFull = classSection.currentEnrollment >= classSection.maxCapacity;

    return {
      isFull,
      message: isFull ? 'Class is full' : 'Class available',
      current: classSection.currentEnrollment,
      max: classSection.maxCapacity,
    };
  } catch (error) {
    console.error('Error validating class capacity:', error);
    throw error;
  }
};

/**
 * UC33 - Validate Wallet Balance
 * Kiểm tra số dư ví có đủ để đăng ký lớp không
 */
const validateWallet = async (studentId, classId) => {
  try {
    // 1. Lấy thông tin student để có userId
    const student = await Student.findById(studentId).exec();
    if (!student) {
      return {
        isSufficient: false,
        message: 'Student not found',
      };
    }

    // 2. Lấy thông tin class và subject để tính phí
    const classSection = await ClassSection.findById(classId)
      .populate('subject')
      .exec();

    if (!classSection) {
      return {
        isSufficient: false,
        message: 'Class not found',
      };
    }

    const subject = classSection.subject;

    // 3. Tính tổng phí = credits * tuitionFee (giá mỗi tín chỉ)
    const totalFee = subject.credits * (subject.tuitionFee || 630000); // Default 630,000 VNĐ/tín chỉ

    // 4. Lấy thông tin wallet của student
    const wallet = await Wallet.findOne({ userId: student.userId }).exec();

    if (!wallet) {
      return {
        isSufficient: false,
        message: 'Wallet not found',
        totalFee,
      };
    }

    // 5. Kiểm tra balance
    const isSufficient = wallet.balance >= totalFee;

    return {
      isSufficient,
      message: isSufficient ? 'Sufficient balance' : 'Insufficient balance',
      currentBalance: wallet.balance,
      totalFee,
      credits: subject.credits,
      pricePerCredit: subject.tuitionFee || 630000,
    };
  } catch (error) {
    console.error('Error validating wallet:', error);
    throw error;
  }
};

/**
 * Helper: Verify prerequisite subjects passed
 * Kiểm tra cụ thể từng môn tiên quyết
 */
const verifyPrerequisiteSubjects = async (studentId, prerequisites) => {
  try {
    const results = [];

    for (const prereq of prerequisites) {
      const enrollment = await ClassEnrollment.findOne({
        student: studentId,
        status: 'completed',
        grade: { $gte: 5.0 },
      })
        .populate({
          path: 'classSection',
          populate: { path: 'subject' },
        })
        .exec();

      const passed = enrollment?.classSection?.subject?.subjectCode === prereq.code;

      results.push({
        code: prereq.code,
        name: prereq.name,
        passed,
      });
    }

    return results;
  } catch (error) {
    console.error('Error verifying prerequisite subjects:', error);
    throw error;
  }
};

module.exports = {
  validatePrerequisites,
  validateClassCapacity,
  validateWallet,
  verifyPrerequisiteSubjects,
};
