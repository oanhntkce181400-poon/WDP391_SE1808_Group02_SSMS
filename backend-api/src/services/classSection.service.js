const ClassSection = require('../models/classSection.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const Subject = require('../models/subject.model');

/**
 * UC22 - Search Available Classes
 * Tìm kiếm các lớp học khả dụng với filter, sort, pagination
 */
const getAvailableClasses = async (criteria = {}) => {
  try {
    const {
      subject_id,
      semester,
      keyword,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = criteria;

    // 1. Build query
    const query = {
      status: { $in: ['published', 'scheduled'] }, // Chỉ lấy lớp published/scheduled
    };

    if (subject_id) {
      query.subject = subject_id;
    }

    if (semester) {
      query.semester = parseInt(semester);
    }

    // Keyword search: tìm theo classCode, className
    if (keyword) {
      query.$or = [
        { classCode: { $regex: keyword, $options: 'i' } },
        { className: { $regex: keyword, $options: 'i' } },
      ];
    }

    // 2. Build sort
    const sortOptions = {};
    const sortField = sortBy === 'created_at' ? 'createdAt' : sortBy;
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    // 3. Execute query with pagination
    const skip = (page - 1) * limit;
    const classes = await ClassSection.find(query)
      .populate('subject', 'subjectCode subjectName credits tuitionFee prerequisites')
      .populate('teacher', 'firstName lastName employeeId')
      .populate('room', 'roomNumber building capacity')
      .populate('timeslot', 'startTime endTime')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean()
      .exec();

    // 4. Count total for pagination
    const total = await ClassSection.countDocuments(query);

    // 5. Calculate occupancy percentage for each class
    const classesWithOccupancy = classes.map((cls) => ({
      ...cls,
      occupancyPercentage: calculateOccupancyPercentage(cls),
      availableSlots: cls.maxCapacity - cls.currentEnrollment,
      isFull: cls.currentEnrollment >= cls.maxCapacity,
    }));

    return {
      classes: classesWithOccupancy,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error getting available classes:', error);
    throw error;
  }
};

/**
 * UC39 - Retrieve Class Information
 * Lấy thông tin chi tiết danh sách lớp
 */
const retrieveClassInformation = async () => {
  try {
    // Lấy tất cả lớp với status published
    const classes = await ClassSection.find({
      status: { $in: ['published', 'scheduled'] },
    })
      .populate('subject', 'subjectCode subjectName credits tuitionFee')
      .populate('teacher', 'firstName lastName')
      .populate('room', 'roomNumber building')
      .populate('timeslot', 'startTime endTime')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Thêm thông tin occupancy và status
    const classesWithDetails = classes.map((cls) => {
      const occupancy = calculateOccupancyPercentage(cls);
      return {
        ...cls,
        occupancyPercentage: occupancy,
        availableSlots: cls.maxCapacity - cls.currentEnrollment,
        capacity: {
          current: cls.currentEnrollment,
          max: cls.maxCapacity,
        },
        statusColor: getClassStatusColor(occupancy),
      };
    });

    return classesWithDetails;
  } catch (error) {
    console.error('Error retrieving class information:', error);
    throw error;
  }
};

/**
 * Fetch class data with enrollment details
 */
const fetchClassData = async (classId) => {
  try {
    const classSection = await ClassSection.findById(classId)
      .populate('subject')
      .populate('teacher')
      .populate('room')
      .populate('timeslot')
      .exec();

    if (!classSection) {
      return null;
    }

    // Get enrollment count
    const enrollmentCount = await ClassEnrollment.countDocuments({
      classSection: classId,
      status: 'enrolled',
    });

    return {
      ...classSection.toObject(),
      currentEnrollment: enrollmentCount,
      occupancyPercentage: calculateOccupancyPercentage({
        currentEnrollment: enrollmentCount,
        maxCapacity: classSection.maxCapacity,
      }),
    };
  } catch (error) {
    console.error('Error fetching class data:', error);
    throw error;
  }
};

/**
 * Calculate occupancy percentage
 * Tính % lấp đầy lớp học
 */
const calculateOccupancyPercentage = (classData) => {
  if (!classData.maxCapacity || classData.maxCapacity === 0) {
    return 0;
  }
  return Math.round((classData.currentEnrollment / classData.maxCapacity) * 100);
};

/**
 * Mark class status based on occupancy
 * Đánh dấu trạng thái lớp theo % lấp đầy
 */
const markClassStatus = (classData) => {
  const occupancy = calculateOccupancyPercentage(classData);

  if (occupancy >= 100) {
    return 'full'; // Đỏ
  } else if (occupancy >= 80) {
    return 'almost-full'; // Vàng
  } else {
    return 'available'; // Xanh
  }
};

/**
 * Get class status color based on occupancy percentage
 */
const getClassStatusColor = (occupancyPercentage) => {
  if (occupancyPercentage >= 100) {
    return 'red'; // Full
  } else if (occupancyPercentage >= 80) {
    return 'yellow'; // Almost full
  } else {
    return 'green'; // Available
  }
};

/**
 * Validate search criteria
 */
const validateSearchCriteria = (criteria) => {
  const errors = [];

  if (criteria.page && criteria.page < 1) {
    errors.push('Page must be greater than 0');
  }

  if (criteria.limit && (criteria.limit < 1 || criteria.limit > 100)) {
    errors.push('Limit must be between 1 and 100');
  }

  if (criteria.sortOrder && !['asc', 'desc'].includes(criteria.sortOrder)) {
    errors.push('Sort order must be "asc" or "desc"');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  getAvailableClasses,
  retrieveClassInformation,
  fetchClassData,
  calculateOccupancyPercentage,
  markClassStatus,
  validateSearchCriteria,
  getClassStatusColor,
};
