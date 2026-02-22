const repo = require("./classSection.repository");
const ClassSection = require("../../models/classSection.model");

const REQUIRED_CLASS_FIELDS = [
  "classCode",
  "className",
  "subject",
  "teacher",
  "room",
  "timeslot",
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
      { className: { $regex: search, $options: "i" } },
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

  // Check for schedule conflict before creating
  if (body.teacher && body.room && body.timeslot && body.dayOfWeek) {
    const conflicts = await checkScheduleConflict({
      teacherId: body.teacher,
      roomId: body.room,
      timeslotId: body.timeslot,
      dayOfWeek: parseInt(body.dayOfWeek, 10),
      semester: parseInt(body.semester, 10),
      academicYear: body.academicYear,
      excludeClassId: null
    });

    if (conflicts.length > 0) {
      const teacherConflict = conflicts.find(c => String(c.teacher?._id) === String(body.teacher));
      const roomConflict = conflicts.find(c => String(c.room?._id) === String(body.room));

      let errorMsg = "Trùng lịch giảng dạy! ";
      if (teacherConflict) {
        errorMsg += `GV ${teacherConflict.teacher?.fullName || teacherConflict.teacher} đã có lớp ${teacherConflict.classCode}. `;
      }
      if (roomConflict) {
        errorMsg += `Phòng ${roomConflict.room?.roomCode || roomConflict.room} đã được đặt cho lớp ${roomConflict.classCode}.`;
      }
      throw new Error(errorMsg);
    }
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
    status: body.status || "active",
    dayOfWeek: body.dayOfWeek,
  });
}

async function updateClassSection(classId, updates = {}) {
  // Check for schedule conflict before updating
  if (updates.teacher && updates.room && updates.timeslot && updates.dayOfWeek && updates.semester && updates.academicYear) {
    const conflicts = await checkScheduleConflict({
      teacherId: updates.teacher,
      roomId: updates.room,
      timeslotId: updates.timeslot,
      dayOfWeek: parseInt(updates.dayOfWeek, 10),
      semester: parseInt(updates.semester, 10),
      academicYear: updates.academicYear,
      excludeClassId: classId
    });

    if (conflicts.length > 0) {
      const teacherConflict = conflicts.find(c => String(c.teacher?._id) === String(updates.teacher));
      const roomConflict = conflicts.find(c => String(c.room?._id) === String(updates.room));

      let errorMsg = "Trùng lịch giảng dạy! ";
      if (teacherConflict) {
        errorMsg += `GV ${teacherConflict.teacher?.fullName || teacherConflict.teacher} đã có lớp ${teacherConflict.classCode}. `;
      }
      if (roomConflict) {
        errorMsg += `Phòng ${roomConflict.room?.roomCode || roomConflict.room} đã được đặt cho lớp ${roomConflict.classCode}.`;
      }
      throw new Error(errorMsg);
    }
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

  await repo.deleteClassById(classId);
  await repo.deleteEnrollmentsByClass(classId);
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

// ─── Check Schedule Conflict ───────────────────────────────────

async function checkScheduleConflict({ teacherId, roomId, timeslotId, dayOfWeek, semester, academicYear, excludeClassId }) {
  // Build query to find conflicts
  const query = {
    semester,
    academicYear,
    status: "active",
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

async function getMyClasses(userId) {
  const Student = require('../../models/student.model');
  const ClassEnrollment = require('../../models/classEnrollment.model');
  
  // Find student by userId
  const student = await Student.findOne({ userId });
  if (!student) {
    throw new Error('Student record not found');
  }

  // Find enrollments for this student
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

  // Extract class sections from enrollments
  return enrollments.map(e => ({
    ...e.classSection.toObject(),
    enrollmentId: e._id,
  }));
}
}

module.exports = {
  listClasses,
  getClassById,
  createClassSection,
  updateClassSection,
  deleteClassSection,
  enrollStudent,
  getStudentEnrollments,
  getClassEnrollments,
  dropCourse,
  checkScheduleConflict,
  getMyClasses,
};
