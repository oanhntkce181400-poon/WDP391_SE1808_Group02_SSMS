const mongoose = require("mongoose");
const Student = require("../models/student.model");
const EnrollmentSnapshot = require("../models/enrollmentSnapshot.model");
const Semester = require("../models/semester.model");

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

async function getStudentViewForUserId(userId) {
  if (!userId) return null;
  const student = await Student.findOne({ userId }).lean();
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
  findPlacementSnapshotTitleForStudent,
};
