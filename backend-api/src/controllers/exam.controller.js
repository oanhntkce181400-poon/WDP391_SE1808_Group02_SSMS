const Exam = require('../models/exam.model');
const StudentExam = require('../models/studentExam.model');
const Student = require('../models/student.model');
const ClassSection = require('../models/classSection.model');
const ClassEnrollment = require('../models/classEnrollment.model');

/**
 * Get exam schedule for current student
 * Based on classes the student has successfully enrolled in
 * Returns: Room, Slot, SBD (Số báo danh)
 */
const getMyExams = async (req, res) => {
  try {
    const userId = req.user.id;

    // Step 1: Find student record by user ID
    const student = await Student.findOne({ email: req.user.email }).exec();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Step 2: Find all enrolled classes
    const classEnrollments = await ClassEnrollment.find({
      student: student._id,
      status: 'enrolled',
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

    // Step 3: Find exams for those classes, populate references
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

    // Step 4: For each exam, get the student's exam registration (SBD)
    const examsWithSBD = await Promise.all(
      exams.map(async (exam) => {
        const studentExam = await StudentExam.findOne({
          exam: exam._id,
          student: student._id,
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
    const userId = req.user.id;

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

    // Find student
    const student = await Student.findOne({ email: req.user.email }).exec();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Get student's exam registration
    const studentExam = await StudentExam.findOne({
      exam: examId,
      student: student._id,
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

    // Validate required fields
    if (
      !examCode ||
      !classSection ||
      !subject ||
      !room ||
      !slot ||
      !examDate ||
      !startTime ||
      !endTime ||
      !maxCapacity
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
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

    const newExam = new Exam({
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

    await newExam.save();

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

    const exam = await Exam.findByIdAndUpdate(examId, updates, {
      new: true,
      runValidators: true,
    })
      .populate('subject')
      .populate('classSection')
      .populate('room')
      .populate('slot')
      .exec();

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

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

    const exam = await Exam.findByIdAndDelete(examId).exec();

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Also delete associated student exam records
    await StudentExam.deleteMany({ exam: examId }).exec();

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
  getMyExams,
  getExamDetails,
  createExam,
  updateExam,
  deleteExam,
  registerStudentForExam,
};
