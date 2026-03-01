const ClassSection = require('../models/classSection.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const Subject = require('../models/subject.model');
const Teacher = require('../models/teacher.model');
const Room = require('../models/room.model');
const Timeslot = require('../models/timeslot.model');
const Student = require('../models/student.model');
const classSectionService = require('../services/classSection.service');

/**
 * UC22 - Search Available Classes
 * GET /api/classes - Search classes with filters
 * Query params: subject_id, semester, keyword, page, limit, sortBy, sortOrder
 */
const searchClasses = async (req, res) => {
  try {
    const { subject_id, semester, keyword, page, limit, sortBy, sortOrder } = req.query;

    // Validate search criteria
    const validation = classSectionService.validateSearchCriteria(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid search criteria',
        errors: validation.errors,
      });
    }

    // Build criteria object
    const criteria = {
      subject_id,
      semester,
      keyword,
      page: page || 1,
      limit: limit || 20,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    };

    // Get available classes
    const result = await classSectionService.getAvailableClasses(criteria);

    return res.status(200).json({
      success: true,
      message: 'Classes retrieved successfully',
      data: result.classes,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error searching classes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search classes',
      error: error.message,
    });
  }
};

/**
 * UC39 - Get Class List with Occupancy Info
 * GET /api/classes/list - Get class list with capacity details
 */
const getClassList = async (req, res) => {
  try {
    const classes = await classSectionService.retrieveClassInformation();

    return res.status(200).json({
      success: true,
      message: 'Class list retrieved successfully',
      data: classes,
      total: classes.length,
    });
  } catch (error) {
    console.error('Error getting class list:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get class list',
      error: error.message,
    });
  }
};

/**
 * Create a new class section
 */
const createClassSection = async (req, res) => {
  try {
    const {
      classCode,
      className,
      subject,
      teacher,
      room,
      timeslot,
      semester,
      academicYear,
      maxCapacity,
    } = req.body;

    // Validate required fields
    if (
      !classCode ||
      !className ||
      !subject ||
      !teacher ||
      !room ||
      !timeslot ||
      !semester ||
      !academicYear ||
      !maxCapacity
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Check if class code already exists
    const existingClass = await ClassSection.findOne({ classCode }).exec();
    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: 'Class code already exists',
      });
    }

    const newClass = new ClassSection({
      classCode,
      className,
      subject,
      teacher,
      room,
      timeslot,
      semester,
      academicYear,
      maxCapacity,
    });

    await newClass.save();

    const populatedClass = await ClassSection.findById(newClass._id)
      .populate('subject')
      .populate('teacher')
      .populate('room')
      .populate('timeslot')
      .exec();

    return res.status(201).json({
      success: true,
      message: 'Class section created successfully',
      data: populatedClass,
    });
  } catch (error) {
    console.error('Error creating class section:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create class section',
      error: error.message,
    });
  }
};

/**
 * Get all class sections
 */
const getAllClassSections = async (req, res) => {
  try {
    const { academicYear, semester, status } = req.query;

    const query = {};
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = parseInt(semester);
    if (status) query.status = status;

    const classSections = await ClassSection.find(query)
      .populate('subject', 'subjectCode subjectName credits')
      .populate('teacher', 'teacherCode fullName email')
      .populate('room', 'roomCode roomName capacity')
      .populate('timeslot', 'groupName startTime endTime')
      .sort({ academicYear: -1, semester: -1 })
      .exec();

    return res.status(200).json({
      success: true,
      data: classSections,
      total: classSections.length,
    });
  } catch (error) {
    console.error('Error getting class sections:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get class sections',
      error: error.message,
    });
  }
};

/**
 * Get class section by ID
 */
const getClassSectionById = async (req, res) => {
  try {
    const { classId } = req.params;

    const classSection = await ClassSection.findById(classId)
      .populate('subject')
      .populate('teacher')
      .populate('room')
      .populate('timeslot')
      .exec();

    if (!classSection) {
      return res.status(404).json({
        success: false,
        message: 'Class section not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: classSection,
    });
  } catch (error) {
    console.error('Error getting class section:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get class section',
      error: error.message,
    });
  }
};

/**
 * Update class section
 */
const updateClassSection = async (req, res) => {
  try {
    const { classId } = req.params;
    const updates = req.body;

    const updatedClass = await ClassSection.findByIdAndUpdate(classId, updates, {
      new: true,
      runValidators: true,
    })
      .populate('subject')
      .populate('teacher')
      .populate('room')
      .populate('timeslot')
      .exec();

    if (!updatedClass) {
      return res.status(404).json({
        success: false,
        message: 'Class section not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Class section updated successfully',
      data: updatedClass,
    });
  } catch (error) {
    console.error('Error updating class section:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update class section',
      error: error.message,
    });
  }
};

/**
 * Delete class section
 */
const deleteClassSection = async (req, res) => {
  try {
    const { classId } = req.params;

    const classSection = await ClassSection.findByIdAndDelete(classId).exec();

    if (!classSection) {
      return res.status(404).json({
        success: false,
        message: 'Class section not found',
      });
    }

    // Delete associated enrollments
    await ClassEnrollment.deleteMany({ classSection: classId }).exec();

    return res.status(200).json({
      success: true,
      message: 'Class section deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting class section:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete class section',
      error: error.message,
    });
  }
};

/**
 * Enroll student in class
 */
const enrollStudentInClass = async (req, res) => {
  try {
    const { classId, studentId } = req.body;

    if (!classId || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Class ID and Student ID are required',
      });
    }

    // Check class exists and has capacity
    const classSection = await ClassSection.findById(classId).exec();
    if (!classSection) {
      return res.status(404).json({
        success: false,
        message: 'Class section not found',
      });
    }

    if (classSection.currentEnrollment >= classSection.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Class is at full capacity',
      });
    }

    // Check student exists
    const student = await Student.findById(studentId).exec();
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if already enrolled
    const existing = await ClassEnrollment.findOne({
      classSection: classId,
      student: studentId,
    }).exec();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this class',
      });
    }

    // Create enrollment
    const enrollment = new ClassEnrollment({
      classSection: classId,
      student: studentId,
      status: 'enrolled',
    });

    await enrollment.save();

    // Update class enrollment count
    classSection.currentEnrollment += 1;
    await classSection.save();

    const populatedEnrollment = await ClassEnrollment.findById(enrollment._id)
      .populate('classSection')
      .populate('student')
      .exec();

    return res.status(201).json({
      success: true,
      message: 'Student enrolled successfully',
      data: populatedEnrollment,
    });
  } catch (error) {
    console.error('Error enrolling student:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to enroll student',
      error: error.message,
    });
  }
};

/**
 * Get student's enrollments
 */
const getStudentEnrollments = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status } = req.query;

    const query = { student: studentId };
    if (status) query.status = status;

    const enrollments = await ClassEnrollment.find(query)
      .populate({
        path: 'classSection',
        populate: [
          { path: 'subject', select: 'subjectCode subjectName credits' },
          { path: 'teacher', select: 'teacherCode fullName' },
          { path: 'room', select: 'roomCode roomName' },
          { path: 'timeslot', select: 'groupName startTime endTime' },
        ],
      })
      .exec();

    return res.status(200).json({
      success: true,
      data: enrollments,
      total: enrollments.length,
    });
  } catch (error) {
    console.error('Error getting enrollments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get enrollments',
      error: error.message,
    });
  }
};

/**
 * Get class enrollments
 */
const getClassEnrollments = async (req, res) => {
  try {
    const { classId } = req.params;
    const { status } = req.query;

    const query = { classSection: classId };
    if (status) query.status = status;

    const enrollments = await ClassEnrollment.find(query)
      .populate('student', 'studentCode fullName email')
      .exec();

    return res.status(200).json({
      success: true,
      data: enrollments,
      total: enrollments.length,
    });
  } catch (error) {
    console.error('Error getting class enrollments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get class enrollments',
      error: error.message,
    });
  }
};

/**
 * Drop course
 */
const dropCourse = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await ClassEnrollment.findById(enrollmentId).exec();

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    if (enrollment.status === 'dropped') {
      return res.status(400).json({
        success: false,
        message: 'Course already dropped',
      });
    }

    enrollment.status = 'dropped';
    await enrollment.save();

    // Update class enrollment count
    const classSection = await ClassSection.findById(enrollment.classSection).exec();
    if (classSection && classSection.currentEnrollment > 0) {
      classSection.currentEnrollment -= 1;
      await classSection.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Course dropped successfully',
      data: enrollment,
    });
  } catch (error) {
    console.error('Error dropping course:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to drop course',
      error: error.message,
    });
  }
};

/**
 * Get current student's enrolled classes
 * GET /api/classes/my-classes
 */
const getMyClasses = async (req, res) => {
  try {
    const userId = req.auth?.sub;
    console.log('🔍 getMyClasses - userId from auth:', userId);
    
    if (!userId) {
      console.log('❌ getMyClasses - No userId in auth token');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Find student by userId
    console.log('🔍 Finding student with userId:', userId);
    const student = await Student.findOne({ userId });
    console.log('✓ Student found:', !!student, 'ID:', student?._id);
    
    if (!student) {
      console.log('❌ Student not found for userId:', userId);
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    console.log('🔍 Finding enrollments for student:', student._id);
    const enrollments = await ClassEnrollment.find({ 
      student: student._id,
      status: { $in: ['enrolled', 'completed'] }
    })
      .populate({
        path: 'classSection',
        populate: [
          { path: 'subject', select: 'subjectCode subjectName credits' },
          { path: 'teacher', select: 'teacherCode fullName' },
          { path: 'room', select: 'roomCode roomName roomNumber' },
          { path: 'timeslot', select: 'groupName startTime endTime dayOfWeek' },
        ],
      })
      .sort({ createdAt: -1 })
      .exec();

    console.log('✓ Found enrollments:', enrollments.length);

    // Extract class sections from enrollments
    const classes = enrollments.map(e => ({
      ...e.classSection.toObject(),
      enrollmentId: e._id,
    }));

    console.log('✓ Sending back', classes.length, 'classes');
    return res.status(200).json({
      success: true,
      data: classes,
      total: classes.length,
    });
  } catch (error) {
    console.error('❌ Error getting my classes:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to get my classes',
      error: error.message,
    });
  }
};

module.exports = {
  searchClasses,
  getClassList,
  createClassSection,
  getAllClassSections,
  getClassSectionById,
  updateClassSection,
  deleteClassSection,
  enrollStudentInClass,
  getStudentEnrollments,
  getClassEnrollments,
  dropCourse,
  getMyClasses,
};
