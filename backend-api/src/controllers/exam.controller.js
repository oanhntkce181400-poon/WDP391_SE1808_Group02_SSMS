const Exam = require('../models/exam.model');
const User = require('../models/user.model');

// Get my exam schedule (for students) - GET /exams/me
exports.getMyExams = async (req, res) => {
  try {
    const userId = req.auth.id || req.auth.sub;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID not found in token',
      });
    }

    // Get user info to find their class code if available
    const user = await User.findById(userId).select('fullName email');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Query exams that match enrolled students
    // Look for exams where the current user is in the enrolledStudents array
    const exams = await Exam.find({
      'enrolledStudents.studentId': userId,
      status: { $in: ['scheduled', 'ongoing', 'completed'] },
    })
      .sort({ examDate: 1 })
      .select('-enrolledStudents') // Don't return full enrolledStudents array to save bandwidth
      .lean();

    // If no exams found via enrolledStudents, try alternative method
    // This could happen if exams haven't been linked to students yet
    if (exams.length === 0) {
      // Return empty array - no exams scheduled for this user
      return res.json({
        success: true,
        data: [],
        message: 'No exams scheduled',
        totalCount: 0,
      });
    }

    // Return exams with essential information
    const formattedExams = exams.map(exam => ({
      id: exam._id,
      examCode: exam.examCode,
      subjectCode: exam.subjectCode,
      subjectName: exam.subjectName,
      classCode: exam.classCode,
      className: exam.className,
      room: exam.room,
      slot: exam.slot,
      examDate: exam.examDate,
      startTime: exam.startTime,
      endTime: exam.endTime,
      sbd: exam.sbd,
      examRules: exam.examRules,
      notes: exam.notes,
      status: exam.status,
    }));

    res.json({
      success: true,
      data: formattedExams,
      totalCount: formattedExams.length,
    });
  } catch (error) {
    console.error('Error fetching student exams:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam schedule',
      error: error.message,
    });
  }
};

// Get all exams (for admin) - GET /exams
exports.getAllExams = async (req, res) => {
  try {
    const { page = 1, limit = 10, keyword, status, examDate, classCode } = req.query;

    const filter = {};
    if (keyword) {
      filter.$or = [
        { examCode: { $regex: keyword, $options: 'i' } },
        { subjectName: { $regex: keyword, $options: 'i' } },
        { classCode: { $regex: keyword, $options: 'i' } },
      ];
    }
    if (status) {
      filter.status = status;
    }
    if (classCode) {
      filter.classCode = classCode;
    }
    if (examDate) {
      const startDate = new Date(examDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(examDate);
      endDate.setHours(23, 59, 59, 999);
      filter.examDate = { $gte: startDate, $lte: endDate };
    }

    const total = await Exam.countDocuments(filter);
    const exams = await Exam.find(filter)
      .sort({ examDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-enrolledStudents')
      .lean();

    res.json({
      success: true,
      data: exams,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exams',
      error: error.message,
    });
  }
};

// Get single exam by ID
exports.getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    res.json({
      success: true,
      data: exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam',
      error: error.message,
    });
  }
};

// Create new exam (for admin)
exports.createExam = async (req, res) => {
  try {
    const {
      examCode,
      subjectCode,
      subjectName,
      classCode,
      className,
      room,
      slot,
      examDate,
      startTime,
      endTime,
      examRules,
      notes,
    } = req.body;

    // Validate required fields
    if (!examCode || !subjectCode || !classCode || !room || !slot || !examDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Check if exam code already exists
    const existingExam = await Exam.findOne({ examCode });
    if (existingExam) {
      return res.status(400).json({
        success: false,
        message: 'Exam code already exists',
      });
    }

    const newExam = new Exam({
      examCode,
      subjectCode,
      subjectName: subjectName || 'Unknown Subject',
      classCode,
      className: className || 'Unknown Class',
      room,
      slot,
      examDate: new Date(examDate),
      startTime,
      endTime,
      examRules: examRules || 'Quy chế thi chung của nhà trường',
      notes,
      createdBy: req.auth.id || req.auth.sub,
    });

    await newExam.save();

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: newExam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create exam',
      error: error.message,
    });
  }
};

// Update exam (for admin)
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.auth.id || req.auth.sub },
      { new: true }
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    res.json({
      success: true,
      message: 'Exam updated successfully',
      data: exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update exam',
      error: error.message,
    });
  }
};

// Delete exam (for admin)
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    res.json({
      success: true,
      message: 'Exam deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete exam',
      error: error.message,
    });
  }
};

// Add students to exam
exports.addStudentsToExam = async (req, res) => {
  try {
    const { studentIds, sbd } = req.body;

    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid studentIds - must be an array',
      });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Add students
    for (const studentId of studentIds) {
      const student = await User.findById(studentId).select('email fullName');
      if (student) {
        const existingStudent = exam.enrolledStudents.find(
          s => s.studentId.toString() === studentId
        );
        if (!existingStudent) {
          exam.enrolledStudents.push({
            studentId,
            fullName: student.fullName,
            sbd: sbd || '',
          });
        }
      }
    }

    await exam.save();

    res.json({
      success: true,
      message: 'Students added to exam successfully',
      data: exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add students to exam',
      error: error.message,
    });
  }
};
