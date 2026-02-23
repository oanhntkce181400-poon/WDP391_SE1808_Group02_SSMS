const repo = require("./classSection.repository");
const mongoose = require("mongoose");
const ClassSection = require("../../models/classSection.model");
const ClassEnrollment = require("../../models/classEnrollment.model");
const Schedule = require("../../models/schedule.model");

const REQUIRED_CLASS_FIELDS = [
  "classCode",
  "className",
  "subject",
  "teacher",
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

  return repo.createClass({
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
  });
}

async function updateClassSection(classId, updates = {}) {
  // Chuyển status "active" cũ thành "published" để tương thích
  if (updates.status === "active") {
    updates.status = "published";
  }
  
  const updated = await repo.updateClassById(classId, updates);
  if (!updated) throw new Error("Class section not found");
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

  // Clean up enrollments first, then delete the class
  await repo.deleteEnrollmentsByClass(classId);
  await repo.deleteClassById(classId);
}

// ─── Enrollment ───────────────────────────────────

async function enrollStudent(classId, studentId) {
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

  const enrollment = await repo.createEnrollment({
    classSection: classId,
    student: studentId,
    status: "enrolled",
  });
  await repo.incrementEnrollmentCount(classId);
  return enrollment;
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

async function checkScheduleConflict({
  teacherId,
  roomId,
  timeslotId,
  dayOfWeek,
  semester,
  academicYear,
  excludeClassId,
}) {
  // Build query to find conflicts
  const query = {
    semester,
    academicYear,
    status: { $nin: ["cancelled", "completed"] },
    $or: [
      // Conflict: Same teacher at same timeslot and dayOfWeek
      {
        teacher: teacherId,
        timeslot: timeslotId,
        dayOfWeek: dayOfWeek,
      },
      // Conflict: Same room at same timeslot and dayOfWeek
      {
        room: roomId,
        timeslot: timeslotId,
        dayOfWeek: dayOfWeek,
      },
    ],
  };

  // If updating, exclude the current class
  if (excludeClassId) {
    query._id = { $ne: excludeClassId };
  }

  return repo.findConflicts(query);
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

  // Get all classes via repository
  const classes = await repo.findClassesByIds(classIds);

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

    // Update status via repository
    await repo.updateClassStatus(cls._id, newStatus);

    results.success.push({
      classId: cls._id,
      classCode: cls.classCode,
      previousStatus: currentStatus,
      newStatus,
    });
  }

  return results;
}

async function selfEnroll(userId, classId) {
  const User = require("../../models/user.model");
  const Student = require("../../models/student.model");

  const user = await User.findById(userId).lean();
  if (!user) throw new Error("Không tìm thấy tài khoản");

  let student = await Student.findOne({ email: user.email }).lean();
  if (!student) {
    const numMatch = (user.email || "").match(/ce18(\d{4})/i);
    const studentCode = numMatch
      ? "CE18" + numMatch[1]
      : "CE18" + Math.floor(1000 + Math.random() * 8999);
    const created = await Student.create({
      userId: user._id,
      email: user.email,
      fullName: user.fullName || user.name || "Sinh viên",
      studentCode,
      cohort: "18",
      majorCode: "CE",
      curriculumCode: "CEK18",
      status: "active",
      enrollmentYear: 2023,
    });
    student = created.toObject();
  }

  return enrollStudent(classId, String(student._id));
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

  // Extract class sections from enrollments, filter out orphaned ones
  return enrollments
    .filter((e) => e.classSection != null)
    .map((e) => ({
      ...e.classSection.toObject(),
      enrollmentId: e._id,
    }));
}

module.exports = {
  listClasses,
  getClassById,
  createClassSection,
  updateClassSection,
  deleteClassSection,
  enrollStudent,
  selfEnroll,
  getStudentEnrollments,
  getClassEnrollments,
  dropCourse,
  reassignClass,
  checkScheduleConflict,
  bulkUpdateStatus,
  getMyClasses,
};
