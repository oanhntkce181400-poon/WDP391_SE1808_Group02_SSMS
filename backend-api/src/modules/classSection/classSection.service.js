const repo = require("./classSection.repository");
const mongoose = require("mongoose");
const ClassSection = require("../../models/classSection.model");
const ClassEnrollment = require("../../models/classEnrollment.model");
const Schedule = require("../../models/schedule.model");
const Student = require("../../models/student.model");
const User = require("../../models/user.model");
const Teacher = require("../../models/teacher.model");
const registrationService = require("../../services/registration.service");

const REQUIRED_CLASS_FIELDS = [
  "classCode",
  "className",
  "subject",
  "teacher",
  // "room" and "timeslot" are optional - assigned later via schedule
  "semester",
  "academicYear",
  "maxCapacity",
];

// ─── Class Section ────────────────────────────────

async function listClasses(query = {}) {
  const {
    academicYear,
    semester,
    status,
    search,
    page = 1,
    limit = 10,
  } = query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  const filter = {};
  if (academicYear) filter.academicYear = academicYear;
  if (semester) filter.semester = parseInt(semester, 10);
  if (status) filter.status = status;

  if (search) {
    const subjectIds = await repo.findSubjectIdsBySearch(search);
    filter.$or = [
      { classCode: { $regex: search, $options: "i" } },
      ...(subjectIds.length > 0 ? [{ subject: { $in: subjectIds } }] : []),
    ];
  }

  const [total, data] = await Promise.all([
    repo.countClasses(filter),
    repo.findClasses(filter, {
      skip: (pageNum - 1) * limitNum,
      limit: limitNum,
    }),
  ]);

  return {
    data,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getClassById(classId) {
  const cls = await repo.findClassById(classId);
  if (!cls) throw new Error("Class section not found");
  return cls;
}

async function createClassSection(body = {}) {
  const missing = REQUIRED_CLASS_FIELDS.filter((f) => !body[f]);
  if (missing.length > 0)
    throw new Error(`Missing required fields: ${missing.join(", ")}`);

  const exists = await repo.findClassByCode(body.classCode);
  if (exists) throw new Error("Class code already exists");

  // Chuyển status "active" cũ thành "published" để tương thích
  let status = body.status || "draft";
  if (status === "active") {
    status = "published";
  }

  // Tạo lớp học phần
  const newClass = await repo.createClass({
    classCode: body.classCode,
    className: body.className,
    subject: body.subject,
    teacher: body.teacher,
    room: body.room,
    timeslot: body.timeslot,
    semester: Number(body.semester),
    academicYear: body.academicYear,
    maxCapacity: Number(body.maxCapacity),
    status: status,
    dayOfWeek: body.dayOfWeek,
    curriculum: body.curriculum || undefined,
  });

  // 🔥 GỌI WAITLIST AUTO-ASSIGN KHI TẠO LỚP THÀNH CÔNG VÀ STATUS LÀ PUBLISHED
  if (status === 'published') {
    try {
      const waitlistService = require('../waitlist/waitlist.service');
      const waitlistResult = await waitlistService.processWaitlist(
        body.subject,
        Number(body.semester),
        body.academicYear
      );
      console.log(`[ClassSection] Waitlist processed: ${waitlistResult.enrolled} students enrolled out of ${waitlistResult.processed}`);
    } catch (waitlistError) {
      // Log lỗi nhưng không ảnh hưởng đến việc tạo lớp
      console.error('[ClassSection] Error processing waitlist:', waitlistError.message);
    }
  }

  return newClass;
}

async function updateClassSection(classId, updates = {}) {
  // Lấy thông tin lớp trước khi cập nhật
  const existingClass = await repo.findClassById(classId);
  if (!existingClass) throw new Error("Class section not found");

  // Chuyển status "active" cũ thành "published" để tương thích
  if (updates.status === "active") {
    updates.status = "published";
  }
  
  const updated = await repo.updateClassById(classId, updates);
  if (!updated) throw new Error("Class section not found");

  // 🔥 GỌI WAITLIST AUTO-ASSIGN KHI STATUS ĐƯỢC CẬP NHẬT THÀNH PUBLISHED
  if (updates.status === 'published' && existingClass.status !== 'published') {
    try {
      const waitlistService = require('../waitlist/waitlist.service');
      const waitlistResult = await waitlistService.processWaitlist(
        updated.subject,
        updated.semester,
        updated.academicYear
      );
      console.log(`[ClassSection] Waitlist processed on update: ${waitlistResult.enrolled} students enrolled out of ${waitlistResult.processed}`);
    } catch (waitlistError) {
      // Log lỗi nhưng không ảnh hưởng đến việc cập nhật lớp
      console.error('[ClassSection] Error processing waitlist on update:', waitlistError.message);
    }
  }

  return updated;
}

function isPeriodOverlap(startA, endA, startB, endB) {
  return Number(startA) <= Number(endB) && Number(startB) <= Number(endA);
}

async function assertLecturerNoConflictForClass(classSection, teacherId) {
  if (!classSection) return;

  const validStatuses = ["draft", "scheduled", "published", "locked"];

  // Quick conflict check for legacy single-slot classes
  if (classSection.dayOfWeek && classSection.timeslot && classSection.semester && classSection.academicYear) {
    const legacyConflict = await ClassSection.findOne({
      _id: { $ne: classSection._id },
      teacher: teacherId,
      semester: classSection.semester,
      academicYear: classSection.academicYear,
      dayOfWeek: classSection.dayOfWeek,
      timeslot: classSection.timeslot,
      status: { $in: validStatuses },
    })
      .select("_id classCode")
      .lean();

    if (legacyConflict) {
      throw new Error(`Giảng viên đã có lịch dạy trùng tại lớp ${legacyConflict.classCode}`);
    }
  }

  const targetSchedules = await Schedule.find({
    classSection: classSection._id,
    status: "active",
  })
    .select("dayOfWeek startPeriod endPeriod")
    .lean();

  if (targetSchedules.length === 0) return;

  const teacherClasses = await ClassSection.find({
    _id: { $ne: classSection._id },
    teacher: teacherId,
    semester: classSection.semester,
    academicYear: classSection.academicYear,
    status: { $in: validStatuses },
  })
    .select("_id classCode")
    .lean();

  if (teacherClasses.length === 0) return;

  const teacherClassIds = teacherClasses.map((c) => c._id);
  const codeById = new Map(teacherClasses.map((c) => [String(c._id), c.classCode]));

  const occupied = await Schedule.find({
    classSection: { $in: teacherClassIds },
    status: "active",
  })
    .select("classSection dayOfWeek startPeriod endPeriod")
    .lean();

  for (const target of targetSchedules) {
    for (const item of occupied) {
      if (Number(item.dayOfWeek) !== Number(target.dayOfWeek)) continue;
      if (!isPeriodOverlap(target.startPeriod, target.endPeriod, item.startPeriod, item.endPeriod)) continue;

      const code = codeById.get(String(item.classSection)) || "(unknown)";
      throw new Error(`Giảng viên đã có lịch dạy trùng tại lớp ${code}`);
    }
  }
}

async function assignLecturerToClass(classId, lecturerId) {
  if (!classId || !lecturerId) {
    throw new Error("Thiếu classId hoặc lecturerId");
  }

  const [classSection, teacher] = await Promise.all([
    repo.findClassById(classId),
    Teacher.findOne({ _id: lecturerId, isActive: true }).lean(),
  ]);

  if (!classSection) throw new Error("Class section not found");
  if (!teacher) throw new Error("Lecturer not found or inactive");

  if (String(classSection.teacher?._id || classSection.teacher) === String(lecturerId)) {
    return classSection;
  }

  await assertLecturerNoConflictForClass(classSection, lecturerId);

  const updated = await repo.updateClassById(classId, { teacher: lecturerId });
  return updated;
}

async function deleteClassSection(classId) {
  const cls = await repo.findClassById(classId);
  if (!cls) throw new Error("Class section not found");

  const activeCount = await repo.countActiveEnrollments(classId);
  if (activeCount > 0) {
    throw new Error(
      `Cannot delete class section: ${activeCount} student(s) currently enrolled. Please drop all enrollments first.`,
    );
  }

  await repo.deleteClassById(classId);
  await repo.deleteEnrollmentsByClass(classId);
}

// ─── Enrollment ───────────────────────────────────

async function enrollStudent(classId, studentId, options = {}) {
  if (!classId || !studentId)
    throw new Error("Class ID and Student ID are required");

  const cls = await repo.findClassById(classId);
  if (!cls) throw new Error("Class section not found");

  if (cls.currentEnrollment >= cls.maxCapacity)
    throw new Error("Class is at full capacity");

  const student = await repo.findStudentById(studentId);
  if (!student) throw new Error("Student not found");

  const existing = await repo.findEnrollment(classId, studentId);
  if (existing) throw new Error("Student is already enrolled in this class");

  // 🔒 Kiểm tra: SV có đang trong waitlist cho môn này không?
  // Nếu đang WAITLIST → KHÔNG cho đăng ký lớp hiện tại
  const waitlistRepo = require('../waitlist/waitlist.repository');
  const waitlistEntry = await waitlistRepo.findOne({
    student: studentId,
    subject: cls.subject,
    targetSemester: cls.semester,
    targetAcademicYear: cls.academicYear,
    status: 'WAITING'
  });
  if (waitlistEntry) {
    throw new Error("Sinh viên đang trong danh sách chờ bảo lưu cho môn này. Vui lòng hủy waitlist trước khi đăng ký lớp mới.");
  }

  const enrollment = await repo.createEnrollment({
    classSection: classId,
    student: studentId,
    status: "enrolled",
    isOverload: options.isOverload === true,
  });
  await repo.incrementEnrollmentCount(classId);
  return enrollment;
}

async function selfEnroll(userId, classId) {
  if (!userId) {
    throw new Error("Unauthorized user");
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error("User not found");
  }

  let student = await Student.findOne({ userId }).lean();
  if (!student && user.email) {
    student = await Student.findOne({ email: String(user.email).toLowerCase() }).lean();
  }

  if (!student) {
    throw new Error("Student record not found");
  }

  const [prerequisites, capacity, wallet, scheduleConflict, eligibility] = await Promise.all([
    registrationService.validatePrerequisites(student._id, classId),
    registrationService.validateClassCapacity(classId),
    registrationService.validateWallet(student._id, classId),
    registrationService.checkScheduleConflict(student._id, classId),
    registrationService.getStudentEligibilitySummary(student._id, classId),
  ]);

  const errors = [];
  if (!prerequisites.eligible) errors.push(prerequisites.message);
  if (capacity.isFull) errors.push(capacity.message);
  if (!wallet.isSufficient) errors.push(wallet.message);
  if (scheduleConflict?.hasConflict) errors.push(scheduleConflict.message);
  if (!eligibility.limits.overload.allowed) errors.push(eligibility.limits.overload.message);
  if (!eligibility.limits.credit.allowed) errors.push(eligibility.limits.credit.message);
  if (!eligibility.limits.cohortAccess.allowed) errors.push(eligibility.limits.cohortAccess.message);

  if (errors.length > 0) {
    throw new Error(errors.join(" | "));
  }

  return enrollStudent(classId, student._id, {
    isOverload: eligibility.limits.overload.enrollingCourseIsOverload === true,
  });
}

async function getStudentEnrollments(studentId, status) {
  return repo.findEnrollmentsByStudent(studentId, status);
}

async function getClassEnrollments(classId, status) {
  return repo.findEnrollmentsByClass(classId, status);
}

async function dropCourse(enrollmentId) {
  const enrollment = await repo.findEnrollmentById(enrollmentId);
  if (!enrollment) throw new Error("Enrollment not found");
  if (enrollment.status === "dropped")
    throw new Error("Course already dropped");

  const updated = await repo.updateEnrollmentStatus(enrollmentId, "dropped");
  await repo.decrementEnrollmentCount(String(enrollment.classSection));
  return updated;
}

// ─── Reassign Class ───────────────────────────────────

async function reassignClass({ fromClassId, toClassId, studentIds, closeSourceClass = false }) {
  try {
    // Bước 1: Validate 2 lớp
    const [fromClass, toClass] = await Promise.all([
      ClassSection.findById(fromClassId),
      ClassSection.findById(toClassId),
    ]);

    if (!fromClass) throw new Error("Lớp nguồn không tồn tại");
    if (!toClass) throw new Error("Lớp đích không tồn tại");

    // Check cùng môn học
    if (String(fromClass.subject) !== String(toClass.subject)) {
      throw new Error("Hai lớp phải cùng môn học");
    }

    // Check cùng học kỳ và năm học
    if (fromClass.semester !== toClass.semester || fromClass.academicYear !== toClass.academicYear) {
      throw new Error("Hai lớp phải cùng học kỳ và năm học");
    }

    // Check lớp đích có lịch học
    const toClassSchedule = await Schedule.countDocuments({
      classSection: toClassId,
      status: "active",
    });

    const toClassHasOldSchedule = toClass.room && toClass.timeslot && toClass.dayOfWeek;

    if (toClassSchedule === 0 && !toClassHasOldSchedule) {
      throw new Error("Lớp đích chưa được gán lịch học");
    }

    // Bước 2: Lấy danh sách sinh viên cần chuyển
    const enrollmentsQuery = {
      classSection: fromClassId,
      status: "enrolled",
    };

    if (studentIds && studentIds.length > 0) {
      enrollmentsQuery.student = { $in: studentIds };
    }

    const enrollmentsToMove = await ClassEnrollment.find(enrollmentsQuery);
    
    // Bước 2.5: Lọc bỏ sinh viên đã có trong lớp đích
    const toClassEnrollments = await ClassEnrollment.find({
      classSection: toClassId,
      status: "enrolled",
    });
    const toClassStudentIds = new Set(toClassEnrollments.map(e => e.student.toString()));
    
    const validEnrollments = enrollmentsToMove.filter(e => !toClassStudentIds.has(e.student.toString()));
    const skippedStudents = enrollmentsToMove.length - validEnrollments.length;
    const studentCount = validEnrollments.length;

    if (studentCount === 0) {
      throw new Error("Không có sinh viên nào để chuyển (tất cả đã đăng ký lớp đích)");
    }

    // Check capacity của lớp đích
    const availableSlots = toClass.maxCapacity - toClass.currentEnrollment;
    if (studentCount > availableSlots) {
      throw new Error(`Lớp đích chỉ còn ${availableSlots} chỗ, cần ${studentCount} chỗ`);
    }

    // Bước 3: Update enrollment - chuyển sinh viên sang lớp mới
    const enrollmentIds = validEnrollments.map(e => e._id);
    await ClassEnrollment.updateMany(
      { _id: { $in: enrollmentIds } },
      { classSection: toClassId }
    );

    // Bước 4: Cập nhật sĩ số 2 lớp
    await ClassSection.findByIdAndUpdate(
      fromClassId,
      { $inc: { currentEnrollment: -studentCount } }
    );

    await ClassSection.findByIdAndUpdate(
      toClassId,
      { $inc: { currentEnrollment: studentCount } }
    );

    // Bước 5: Nếu closeSourceClass = true và lớp nguồn không còn SV thì đóng lớp
    if (closeSourceClass) {
      const remainingCount = await ClassEnrollment.countDocuments({
        classSection: fromClassId,
        status: "enrolled",
      });

      if (remainingCount === 0) {
        await ClassSection.findByIdAndUpdate(
          fromClassId,
          { status: "cancelled" }
        );
      }
    }

    return {
      success: true,
      movedCount: studentCount,
      skippedCount: skippedStudents,
      fromClassId,
      toClassId,
      closeSourceClass: closeSourceClass && (await ClassEnrollment.countDocuments({ classSection: fromClassId, status: "enrolled" })) === 0,
    };
  } catch (error) {
    throw error;
  }
}

// ─── Check Schedule Conflict ───────────────────────────────────

async function checkScheduleConflict({ teacherId, roomId, timeslotId, dayOfWeek, semester, academicYear, excludeClassId }) {
  // Các status hợp lệ để kiểm tra conflict
  const validStatuses = ['draft', 'scheduled', 'published', 'locked'];

  // Build query to find conflicts
  const query = {
    semester,
    academicYear,
    status: { $in: validStatuses },
    $or: [
      // Conflict: Same teacher at same timeslot and dayOfWeek
      {
        teacher: teacherId,
        timeslot: timeslotId,
        dayOfWeek: dayOfWeek
      },
      // Conflict: Same room at same timeslot and dayOfWeek
      {
        room: roomId,
        timeslot: timeslotId,
        dayOfWeek: dayOfWeek
      }
    ]
  };

  // If updating, exclude the current class
  if (excludeClassId) {
    query._id = { $ne: excludeClassId };
  }

  const conflicts = await ClassSection.find(query)
    .populate("teacher", "teacherCode fullName")
    .populate("room", "roomCode roomName")
    .populate("timeslot", "groupName startTime endTime")
    .populate("subject", "subjectCode subjectName")
    .lean();

  return conflicts;
}

// ─── Bulk Update Status ───────────────────────────────────

const VALID_STATUS_TRANSITIONS = {
  draft: ["scheduled", "published", "cancelled"],
  scheduled: ["published", "cancelled"],
  published: ["locked", "completed", "cancelled"],
  locked: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

async function bulkUpdateStatus(classIds, newStatus) {
  if (!classIds || classIds.length === 0) {
    throw new Error("Danh sách ID lớp học không được để trống");
  }

  if (!newStatus) {
    throw new Error("Trạng thái mới không được để trống");
  }

  // Get all classes
  const classes = await ClassSection.find({ _id: { $in: classIds } })
    .populate("teacher", "fullName")
    .populate("subject", "subjectCode subjectName")
    .lean();

  if (classes.length !== classIds.length) {
    throw new Error("Một số lớp học không tồn tại");
  }

  const results = {
    success: [],
    failed: [],
  };

  for (const cls of classes) {
    const currentStatus = cls.status || "draft";
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];

    // Validate status transition
    if (!allowedTransitions.includes(newStatus)) {
      results.failed.push({
        classId: cls._id,
        classCode: cls.classCode,
        currentStatus,
        message: `Không thể chuyển từ "${currentStatus}" sang "${newStatus}"`,
      });
      continue;
    }

    // Special validation for publishing: check if class has schedule
    if (newStatus === "published") {
      // Check in Schedule collection
      const Schedule = require("../../models/schedule.model");
      const scheduleCount = await Schedule.countDocuments({
        classSection: cls._id,
        status: "active",
      });

      // Also check if ClassSection has room/timeslot (old format)
      const hasOldSchedule = cls.room && cls.timeslot && cls.dayOfWeek;

      if (scheduleCount === 0 && !hasOldSchedule) {
        results.failed.push({
          classId: cls._id,
          classCode: cls.classCode,
          currentStatus,
          message: `Lớp ${cls.classCode} chưa được gán lịch học, không thể mở lớp`,
        });
        continue;
      }
    }

    // Update status
    await ClassSection.findByIdAndUpdate(cls._id, { status: newStatus });

    results.success.push({
      classId: cls._id,
      classCode: cls.classCode,
      previousStatus: currentStatus,
      newStatus,
    });
  }

  return results;
}

async function getMyClasses(userId) {
  const Student = require("../../models/student.model");
  const ClassEnrollment = require("../../models/classEnrollment.model");

  // Find student by userId
  const student = await Student.findOne({ userId });
  if (!student) {
    throw new Error("Student record not found");
  }

  // Find enrollments for this student
  const enrollments = await ClassEnrollment.find({
    student: student._id,
    status: { $in: ["enrolled", "completed"] },
  })
    .populate({
      path: "classSection",
      populate: [
        { path: "subject", select: "subjectCode subjectName credits" },
        { path: "teacher", select: "teacherCode fullName" },
        { path: "room", select: "roomCode roomName roomNumber" },
        { path: "timeslot", select: "groupName startTime endTime dayOfWeek" },
      ],
    })
    .sort({ createdAt: -1 })
    .exec();

  // Extract class sections from enrollments
  return enrollments.map((e) => ({
    ...e.classSection.toObject(),
    enrollmentId: e._id,
  }));
}

// ─── UC22 - Search Available Classes ────────────────────────────────

/**
 * Search available classes with advanced filters
 * For student registration feature
 */
async function searchAvailableClasses(criteria = {}) {
  const {
    subject_id,
    semester,
    keyword,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = criteria;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  // Build query - only published/scheduled classes
  const filter = {
    status: { $in: ['published', 'scheduled'] },
  };

  if (subject_id) filter.subject = subject_id;
  if (semester) filter.semester = parseInt(semester, 10);

  // Keyword search
  if (keyword) {
    const subjectIds = await repo.findSubjectIdsBySearch(keyword);
    filter.$or = [
      { classCode: { $regex: keyword, $options: 'i' } },
      { className: { $regex: keyword, $options: 'i' } },
      ...(subjectIds.length > 0 ? [{ subject: { $in: subjectIds } }] : []),
    ];
  }

  // Build sort
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const [total, classes] = await Promise.all([
    repo.countClasses(filter),
    repo.findClasses(filter, {
      skip: (pageNum - 1) * limitNum,
      limit: limitNum,
      sort: sortOptions,
    }),
  ]);

  // Add occupancy info
  const classesWithOccupancy = classes.map((cls) => {
    const occupancy = Math.round((cls.currentEnrollment / cls.maxCapacity) * 100) || 0;
    return {
      ...cls,
      occupancyPercentage: occupancy,
      availableSlots: cls.maxCapacity - cls.currentEnrollment,
      isFull: cls.currentEnrollment >= cls.maxCapacity,
    };
  });

  return {
    classes: classesWithOccupancy,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

// ─── UC39 - View Class List with Capacity ────────────────────────────────

/**
 * Get class list with occupancy percentage and status color
 */
async function getClassListWithCapacity() {
  const classes = await repo.findClasses(
    { status: { $in: ['published', 'scheduled'] } },
    { sort: { createdAt: -1 } }
  );

  return classes.map((cls) => {
    const occupancy = Math.round((cls.currentEnrollment / cls.maxCapacity) * 100) || 0;
    let statusColor = 'green'; // Available
    if (occupancy >= 100) statusColor = 'red'; // Full
    else if (occupancy >= 80) statusColor = 'yellow'; // Almost full

    return {
      ...cls,
      occupancyPercentage: occupancy,
      availableSlots: cls.maxCapacity - cls.currentEnrollment,
      capacity: {
        current: cls.currentEnrollment,
        max: cls.maxCapacity,
      },
      statusColor,
    };
  });
}
// ─── Get Class Details for Student ───────────────────────────────────

async function getClassDetails(classId, userId) {
  const ClassEnrollment = require("../../models/classEnrollment.model");
  const Student = require("../../models/student.model");
  const Schedule = require("../../models/schedule.model");

  // Find student by userId
  const student = await Student.findOne({ userId });
  if (!student) {
    throw new Error("Student record not found");
  }

  // Check if student is enrolled in this class
  const enrollment = await ClassEnrollment.findOne({
    student: student._id,
    classSection: classId,
    status: { $in: ["enrolled", "completed"] },
  });

  if (!enrollment) {
    throw new Error("Bạn chưa đăng ký lớp học phần này");
  }

  // Get class with all related data
  const repo = require("./classSection.repository");
  const cls = await repo.findClassById(classId)
    .populate("subject")
    .populate("teacher")
    .populate("room")
    .populate("timeslot");

  if (!cls) {
    throw new Error("Class section not found");
  }

  // Get schedules from new Schedule model
  const schedules = await Schedule.find({
    classSection: classId,
    status: "active",
  }).populate("room", "roomCode roomName");

  // Get classmates (enrolled students) - limit to 50
  const classmates = await ClassEnrollment.find({
    classSection: classId,
    status: "enrolled",
  })
    .populate("student", "studentCode fullName email")
    .limit(50);

  return {
    classId: cls._id,
    classCode: cls.classCode,
    className: cls.className,
    subject: cls.subject,
    teacher: cls.teacher,
    schedules: schedules.map(s => ({
      dayOfWeek: s.dayOfWeek,
      startPeriod: s.startPeriod,
      endPeriod: s.endPeriod,
      startDate: s.startDate,
      endDate: s.endDate,
      room: s.room,
    })),
    // Fallback for old schedule format
    room: cls.room,
    timeslot: cls.timeslot,
    dayOfWeek: cls.dayOfWeek,
    syllabus: cls.subject?.syllabus || "Chưa cập nhật",
    materials: cls.subject?.materials || [],
    classmates: classmates.map(c => ({
      studentId: c.student?.studentCode,
      name: c.student?.fullName,
      email: c.student?.email,
    })),
    enrollmentStatus: enrollment.status,
    currentEnrollment: cls.currentEnrollment,
    maxCapacity: cls.maxCapacity,
  };
}

// ─── UC99 - View Class Roster ───────────────────────────────────

async function getClassRosterForStudent(classId, userId) {
  const ClassEnrollment = require("../../models/classEnrollment.model");
  const Student = require("../../models/student.model");

  // BR17: Authorization dựa trên enrollment hợp lệ
  const student = await Student.findOne({ userId }).lean();
  if (!student) {
    throw new Error("Student record not found");
  }

  const cls = await repo.findClassById(classId);
  if (!cls) {
    throw new Error("Class section not found");
  }

  // BR16: Chỉ được xem roster của lớp đã enrolled
  const myEnrollment = await ClassEnrollment.findOne({
    classSection: classId,
    student: student._id,
    status: { $in: ["enrolled", "completed"] },
  }).lean();

  if (!myEnrollment) {
    throw new Error("Bạn chỉ có thể xem danh sách lớp mà bạn đã đăng ký");
  }

  // BR18: Chỉ trả sinh viên thuộc class section được chọn
  const enrollments = await ClassEnrollment.find({
    classSection: classId,
    status: { $in: ["enrolled", "completed"] },
  })
    .populate("student", "studentCode fullName email")
    .sort({ createdAt: 1 })
    .lean();

  return {
    classSection: {
      _id: cls._id,
      classCode: cls.classCode,
      className: cls.className,
      subject: cls.subject
        ? {
            subjectCode: cls.subject.subjectCode,
            subjectName: cls.subject.subjectName,
          }
        : null,
      teacher: cls.teacher
        ? {
            teacherCode: cls.teacher.teacherCode,
            fullName: cls.teacher.fullName,
          }
        : null,
    },
    students: enrollments
      .filter((e) => e.student)
      .map((e) => ({
        enrollmentId: e._id,
        studentId: e.student._id,
        studentCode: e.student.studentCode,
        fullName: e.student.fullName,
        email: e.student.email,
        status: e.status,
      })),
  };
}

// ─── Bulk Create Class Sections from Curriculum ───────────────────────────────────

async function bulkCreateClassSections(classDataList, createdBy) {
  const Subject = require("../../models/subject.model");
  const results = { success: [], failed: [] };

  for (const classData of classDataList) {
    try {
      const { subjectId, semester, academicYear, maxCapacity = 50 } = classData;
      const subject = await Subject.findById(subjectId);
      if (!subject) {
        results.failed.push({ subjectId, error: "Subject not found" });
        continue;
      }

      const subjectCode = subject.subjectCode;
      const classCode = `${subjectCode}-${academicYear?.replace("/", "")}-${semester}-${Date.now().toString(36).toUpperCase()}`;

      const newClass = await repo.createClass({
        classCode,
        className: subject.subjectName,
        subject: subjectId,
        semester: parseInt(semester, 10),
        academicYear,
        maxCapacity,
        currentEnrollment: 0,
        status: "draft",
        createdBy,
      });

      results.success.push({
        classId: newClass._id,
        classCode: newClass.classCode,
        subjectName: subject.subjectName,
      });
    } catch (error) {
      results.failed.push({ subjectId: classData.subjectId, error: error.message });
    }
  }
  return results;
}

// Export all functions
module.exports = {
  listClasses,
  getClassById,
  createClassSection,
  updateClassSection,
  assignLecturerToClass,
  deleteClassSection,
  enrollStudent,
  getStudentEnrollments,
  getClassEnrollments,
  dropCourse,
  selfEnroll,
  reassignClass,
  checkScheduleConflict,
  bulkUpdateStatus,
  getMyClasses,
  searchAvailableClasses,
  getClassListWithCapacity,
  getClassDetails,
  getClassRosterForStudent,
  bulkCreateClassSections,
};
