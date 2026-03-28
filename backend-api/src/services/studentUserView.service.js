const mongoose = require("mongoose");
const Student = require("../models/student.model");
const User = require("../models/user.model");
const EnrollmentSnapshot = require("../models/enrollmentSnapshot.model");
const Semester = require("../models/semester.model");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findStudentByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const exact = await Student.findOne({ email: normalizedEmail }).lean();
  if (exact) return exact;

  const pattern = new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i");
  return Student.findOne({ email: { $regex: pattern } }).lean();
}

async function resolveStudentForUser({ userId, email, autoLinkByEmail = false } = {}) {
  if (!userId) return null;

  let student = await Student.findOne({ userId }).lean();
  if (student || !autoLinkByEmail) {
    return student;
  }

  const emailMatchedStudent = await findStudentByEmail(email);
  if (!emailMatchedStudent) {
    return null;
  }

  const currentLinkedUserId = emailMatchedStudent.userId
    ? String(emailMatchedStudent.userId)
    : "";
  const targetUserId = String(userId);

  if (currentLinkedUserId === targetUserId) {
    return emailMatchedStudent;
  }

  let relinkFilter = null;

  if (!currentLinkedUserId) {
    relinkFilter = {
      _id: emailMatchedStudent._id,
      $or: [{ userId: { $exists: false } }, { userId: null }],
    };
  } else {
    const linkedUserExists = await User.exists({ _id: emailMatchedStudent.userId });
    if (!linkedUserExists) {
      relinkFilter = {
        _id: emailMatchedStudent._id,
        userId: emailMatchedStudent.userId,
      };
    }
  }

  if (!relinkFilter) {
    return null;
  }

  student = await Student.findOneAndUpdate(
    relinkFilter,
    { $set: { userId } },
    { new: true },
  ).lean();

  if (student) {
    return student;
  }

  return Student.findOne({ userId }).lean();
}

/**
 * Tên lớp trong "Lịch sử xếp lớp (đã lưu)" = EnrollmentSnapshot.title (VD: SE101, SE102).
 * Tìm bản ghi mới nhất có log chứa sinh viên, ưu tiên khớp filters.classGroup với student.classSection.
 */
async function findPlacementSnapshotTitleForStudent(studentDoc) {
  if (!studentDoc?._id) return null;

  const activeSystemSemester = await Semester.findOne({
    isCurrent: true,
    isActive: true,
  })
    .select("_id")
    .lean();

  const sid = studentDoc._id;
  const idStr = String(sid);
  const idVariants = [sid, idStr];
  if (mongoose.Types.ObjectId.isValid(idStr)) {
    idVariants.push(new mongoose.Types.ObjectId(idStr));
  }

  const core = {
    dryRun: { $ne: true },
    logs: { $elemMatch: { studentId: { $in: idVariants } } },
  };

  const semId = activeSystemSemester?._id;

  async function findTitle(extra) {
    const snap = await EnrollmentSnapshot.findOne({ ...core, ...extra })
      .sort({ createdAt: -1 })
      .select("title")
      .lean();
    return snap?.title ? String(snap.title).trim() : null;
  }

  const cg = studentDoc.classSection && String(studentDoc.classSection).trim();
  if (cg) {
    if (semId) {
      const t = await findTitle({ semesterId: semId, "filters.classGroup": cg });
      if (t) return t;
    }
    const t2 = await findTitle({ "filters.classGroup": cg });
    if (t2) return t2;
  }
  if (semId) {
    const t = await findTitle({ semesterId: semId });
    if (t) return t;
  }
  return findTitle({});
}

async function getStudentViewForUserId(userId, options = {}) {
  if (!userId) return null;

  const student = await resolveStudentForUser({
    userId,
    email: options.email,
    autoLinkByEmail: Boolean(options.autoLinkByEmail),
  });

  if (!student) return null;

  const placementClassName = await findPlacementSnapshotTitleForStudent(student);

  return {
    studentCode: student.studentCode,
    classSection: student.classSection,
    cohort: student.cohort,
    majorCode: student.majorCode,
    academicStatus: student.academicStatus,
    enrollmentYear: student.enrollmentYear,
    currentCurriculumSemester: student.currentCurriculumSemester,
    placementClassName,
  };
}

module.exports = {
  getStudentViewForUserId,
  resolveStudentForUser,
  findPlacementSnapshotTitleForStudent,
};
