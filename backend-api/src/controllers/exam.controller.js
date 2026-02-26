const Exam = require('../models/exam.model');
const StudentExam = require('../models/studentExam.model');
const ClassSection = require('../models/classSection.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const examService = require('../services/exam.service');
const examRepository = require('../modules/exam/exam.repository');

/**
 * Admin: Get all exams with filtering, pagination and search
 */
const getAllExams = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      keyword = '',
      subject,
      room,
      examDate,
      startDate,
      endDate,
      status,
      sortBy = 'examDate',
      sortOrder = 'desc',
    } = req.query;

    // Build query filters
    const query = {};

    // Keyword search (examCode)
    if (keyword) {
      query.examCode = { $regex: keyword, $options: 'i' };
    }

    // Filter by subject
    if (subject) {
      query.subject = subject;
    }

    // Filter by room
    if (room) {
      query.room = room;
    }

    // Filter by exact exam date
    if (examDate) {
      const date = new Date(examDate);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      query.examDate = {
        $gte: date,
        $lt: nextDate,
      };
    }

    // Filter by date range
    if (startDate && endDate) {
      query.examDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Use repository to fetch data
    const [data, total] = await Promise.all([
      examRepository.findWithFilter(query, {
        skip,
        limit: parseInt(limit),
        sort: sortOptions,
      }),
      examRepository.countExams(query),
    ]);

    return res.status(200).json({
      success: true,
      data,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Error getting all exams:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get exams',
      error: error.message,
    });
  }
};

/**
 * Get exam schedule for current student
 * Based on classes the student has successfully enrolled in
 * Returns: Room, Slot, SBD (Số báo danh)
 */
const getMyExams = async (req, res) => {
  try {
    const studentId = req.auth?.sub;
    
    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Step 1: Find all enrolled classes
    const classEnrollments = await ClassEnrollment.find({
      student: studentId,
      status: { $in: ['enrolled', 'active', 'completed'] },
    })
      .populate('classSection')
      .exec();

    if (classEnrollments.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No enrolled classes found',
      });
    }

    const enrolledClassIds = classEnrollments.map((e) => e.classSection._id);

    // Step 2: Find exams for those classes, populate references
    const exams = await Exam.find({
      classSection: { $in: enrolledClassIds },
      status: { $ne: 'cancelled' },
    })
      .populate('subject', 'subjectCode subjectName credits')
      .populate('classSection', 'classCode className')
      .populate('room', 'roomCode roomName capacity')
      .populate('slot', 'groupName startTime endTime')
      .sort({ examDate: 1 })
      .exec();

    // Step 3: For each exam, get the student's exam registration (SBD)
    const examsWithSBD = await Promise.all(
      exams.map(async (exam) => {
        const studentExam = await StudentExam.findOne({
          exam: exam._id,
          student: studentId,
        }).exec();

        return {
          _id: exam._id,
          examCode: exam.examCode,
          subject: exam.subject,
          classSection: exam.classSection,
          room: exam.room,
          slot: exam.slot,
          examDate: exam.examDate,
          startTime: exam.startTime,
          endTime: exam.endTime,
          examRules: exam.examRules,
          notes: exam.notes,
          status: exam.status,
          // Student-specific data
          sbd: studentExam?.sbd || null, // Số báo danh
          seatNumber: studentExam?.seatNumber || null,
          registrationStatus: studentExam?.status || 'not-registered',
          registrationDate: studentExam?.registrationDate || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: examsWithSBD,
      total: examsWithSBD.length,
    });
  } catch (error) {
    console.error('Error getting student exams:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get exam schedule',
      error: error.message,
    });
  }
};

/**
 * Get single exam details
 */
const getExamDetails = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.auth?.sub;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get exam details
    const exam = await Exam.findById(examId)
      .populate('subject', 'subjectCode subjectName credits')
      .populate('classSection', 'classCode className')
      .populate('room', 'roomCode roomName capacity roomType')
      .populate('slot', 'groupName startTime endTime startDate endDate')
      .exec();

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Get student's exam registration
    const studentExam = await StudentExam.findOne({
      exam: examId,
      student: studentId,
    }).exec();

    if (!studentExam) {
      return res.status(404).json({
        success: false,
        message: 'You are not registered for this exam',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...exam.toObject(),
        sbd: studentExam.sbd,
        seatNumber: studentExam.seatNumber,
        registrationStatus: studentExam.status,
      },
    });
  } catch (error) {
    console.error('Error getting exam details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get exam details',
      error: error.message,
    });
  }
};

/**
 * Admin: Create new exam
 */
const createExam = async (req, res) => {
  try {
    const {
      examCode,
      classSection,
      subject,
      room,
      slot,
      examDate,
      startTime,
      endTime,
      examRules,
      notes,
      maxCapacity,
    } = req.body;

    // Validate using service layer
    const validation = await examService.validateExamCreation({
      examCode,
      subject,
      room,
      slot,
      examDate,
      startTime,
      endTime,
      maxCapacity,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
        roomConflict: validation.roomConflict,
        studentConflict: validation.studentConflict,
      });
    }

    // Check if exam code already exists
    const existingExam = await Exam.findOne({ examCode }).exec();
    if (existingExam) {
      return res.status(400).json({
        success: false,
        message: 'Exam code already exists',
      });
    }

    // Create exam using repository
    const newExam = await examRepository.save({
      examCode,
      classSection,
      subject,
      room,
      slot,
      examDate,
      startTime,
      endTime,
      examRules,
      notes,
      maxCapacity,
    });

    // Notify students (async, don't wait)
    examService.notifyStudents(newExam, 'created').catch((err) => {
      console.error('Error notifying students:', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: newExam,
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create exam',
      error: error.message,
    });
  }
};

/**
 * Admin: Update exam
 */
const updateExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const updates = req.body;

    // Validate updates using service layer
    const validation = await examService.validateExamUpdate(examId, updates);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    // Update exam using repository
    const exam = await examRepository.update(examId, updates);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Notify students about update (async, don't wait)
    examService.notifyStudents(exam, 'updated').catch((err) => {
      console.error('Error notifying students:', err);
    });

    return res.status(200).json({
      success: true,
      message: 'Exam updated successfully',
      data: exam,
    });
  } catch (error) {
    console.error('Error updating exam:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update exam',
      error: error.message,
    });
  }
};

/**
 * Admin: Delete exam
 */
const deleteExam = async (req, res) => {
  try {
    const { examId } = req.params;

    // Get exam details before deletion for notification
    const exam = await examRepository.findById(examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Delete exam using repository
    await examRepository.deleteById(examId);

    // Also delete associated student exam records
    await examRepository.deleteStudentExams(examId);

    // Notify students about deletion (async, don't wait)
    examService.notifyStudents(exam, 'deleted').catch((err) => {
      console.error('Error notifying students:', err);
    });

    return res.status(200).json({
      success: true,
      message: 'Exam deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting exam:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete exam',
      error: error.message,
    });
  }
};

/**
 * Admin: Register student for exam (assign SBD)
 */
const registerStudentForExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { studentId, sbd, seatNumber } = req.body;

    if (!studentId || !sbd) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and SBD are required',
      });
    }

    // Check if student exists
    const student = await Student.findById(studentId).exec();
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if exam exists
    const exam = await Exam.findById(examId).exec();
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Create or update student exam record
    let studentExam = await StudentExam.findOne({
      exam: examId,
      student: studentId,
    }).exec();

    if (studentExam) {
      studentExam.sbd = sbd;
      if (seatNumber) studentExam.seatNumber = seatNumber;
      studentExam.status = 'registered';
    } else {
      studentExam = new StudentExam({
        exam: examId,
        student: studentId,
        sbd,
        seatNumber,
        status: 'registered',
      });
    }

    await studentExam.save();

    return res.status(200).json({
      success: true,
      message: 'Student registered for exam successfully',
      data: studentExam,
    });
  } catch (error) {
    console.error('Error registering student for exam:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register student for exam',
      error: error.message,
    });
  }
};

module.exports = {
  getAllExams,
  getMyExams,
  getExamDetails,
  createExam,
  updateExam,
  deleteExam,
  registerStudentForExam,
};
