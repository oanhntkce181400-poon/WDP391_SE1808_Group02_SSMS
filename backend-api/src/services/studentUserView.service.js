const mongoose = require("mongoose");
const Student = require("../models/student.model");
const User = require("../models/user.model");
const Major = require("../models/major.model");
const EnrollmentSnapshot = require("../models/enrollmentSnapshot.model");
const Semester = require("../models/semester.model");
const curriculumService = require("./curriculum.service");
const { getOrCreateWallet } = require("./wallet.service");

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

function calculateCohortFromEnrollmentYear(enrollmentYear) {
  const yearNumber = Number(enrollmentYear);
  if (!Number.isFinite(yearNumber)) return null;

  const yearStr = String(Math.trunc(yearNumber));
  const lastTwo = yearStr.slice(-2);
  const cohortValue = lastTwo === "00" ? yearStr.slice(0, 2) : lastTwo;
  const cohort = Number(cohortValue);
  return Number.isFinite(cohort) ? cohort : null;
}

async function generateStudentCodeForAutoProfile(majorCode, enrollmentYear) {
  const normalizedMajorCode = String(majorCode || "").trim().toUpperCase();
  if (!normalizedMajorCode) {
    throw new Error("Missing majorCode for auto-created student profile");
  }

  const yearSuffix = String(enrollmentYear).slice(-2);
  const prefix = `${normalizedMajorCode}${yearSuffix}`;
  const re = new RegExp(`^${escapeRegex(prefix)}\\d+$`);
  const docs = await Student.find({ studentCode: re }).select("studentCode").lean();

  let maxSeq = 0;
  for (const doc of docs) {
    const tail = String(doc.studentCode || "").slice(prefix.length);
    const seq = parseInt(tail, 10);
    if (!Number.isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

async function resolveAutoProfileDefaults(user) {
  const configuredMajorCode = String(process.env.GOOGLE_AUTO_STUDENT_MAJOR_CODE || "")
    .trim()
    .toUpperCase();
  const major =
    (configuredMajorCode &&
      (await Major.findOne({
        majorCode: configuredMajorCode,
        isActive: true,
      }).lean())) ||
    (await Major.findOne({ isActive: true }).sort({ majorCode: 1, createdAt: 1 }).lean());

  if (!major) {
    throw new Error("No active major found for Google student auto profile");
  }

  const configuredEnrollmentYear = Number(process.env.GOOGLE_AUTO_STUDENT_ENROLLMENT_YEAR);
  const enrollmentYear = Number.isFinite(configuredEnrollmentYear)
    ? configuredEnrollmentYear
    : new Date().getFullYear();

  const configuredCohort = Number(process.env.GOOGLE_AUTO_STUDENT_COHORT);
  const cohort = Number.isFinite(configuredCohort)
    ? configuredCohort
    : calculateCohortFromEnrollmentYear(enrollmentYear);

  const configuredCurriculumSemester = Number(
    process.env.GOOGLE_AUTO_STUDENT_CURRICULUM_SEMESTER || 1,
  );
  const currentCurriculumSemester =
    Number.isFinite(configuredCurriculumSemester) && configuredCurriculumSemester > 0
      ? configuredCurriculumSemester
      : 1;

  const configuredClassSection = String(process.env.GOOGLE_AUTO_STUDENT_CLASS_SECTION || "").trim();
  const classSection = configuredClassSection || undefined;

  let curriculumId = null;
  try {
    const curriculum = await curriculumService.getCurriculumForStudent({
      majorCode: major.majorCode,
      enrollmentYear,
      cohort,
    });
    curriculumId = curriculum?._id || null;
  } catch (error) {
    curriculumId = null;
  }

  return {
    major,
    enrollmentYear,
    cohort,
    currentCurriculumSemester,
    classSection,
    curriculumId,
    fullName: user?.fullName || user?.email || "Google Student",
    email: normalizeEmail(user?.email),
  };
}

function isDuplicateError(error, key) {
  const message = String(error?.message || "");
  if (!(error?.code === 11000 || message.includes("E11000 duplicate key"))) {
    return false;
  }

  return key ? message.includes(key) : true;
}

async function createAutoStudentProfileForUser(user) {
  if (!user?._id || !user?.email) {
    return null;
  }

  const defaults = await resolveAutoProfileDefaults(user);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const studentCode = await generateStudentCodeForAutoProfile(
      defaults.major.majorCode,
      defaults.enrollmentYear,
    );

    try {
      const created = await Student.create({
        studentCode,
        fullName: defaults.fullName,
        email: defaults.email,
        majorCode: defaults.major.majorCode,
        majorId: defaults.major._id,
        cohort: defaults.cohort,
        classSection: defaults.classSection,
        academicStatus: "enrolled",
        enrollmentYear: defaults.enrollmentYear,
        curriculumId: defaults.curriculumId || undefined,
        currentCurriculumSemester: defaults.currentCurriculumSemester,
        userId: user._id,
        isActive: true,
      });

      await getOrCreateWallet(user._id);
      return created.toObject ? created.toObject() : created;
    } catch (error) {
      if (isDuplicateError(error, "studentCode")) {
        continue;
      }

      if (isDuplicateError(error, "email") || isDuplicateError(error, "userId")) {
        return resolveStudentForUser({
          userId: user._id,
          email: user.email,
          autoLinkByEmail: true,
        });
      }

      throw error;
    }
  }

  return resolveStudentForUser({
    userId: user._id,
    email: user.email,
    autoLinkByEmail: true,
  });
}

async function ensureStudentProfileForUser({
  userId,
  email,
  autoLinkByEmail = false,
  autoCreateMissingProfile = false,
  user = null,
} = {}) {
  let student = await resolveStudentForUser({ userId, email, autoLinkByEmail });
  if (student || !autoCreateMissingProfile) {
    return student;
  }

  const resolvedUser =
    user ||
    (userId ? await User.findById(userId).select("_id email fullName role authProvider").lean() : null);
  if (!resolvedUser) {
    return null;
  }

  if (String(resolvedUser.role || "").trim().toLowerCase() !== "student") {
    return null;
  }

  student = await createAutoStudentProfileForUser(resolvedUser);
  return student;
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

  const student = await ensureStudentProfileForUser({
    userId,
    email: options.email,
    autoLinkByEmail: Boolean(options.autoLinkByEmail),
    autoCreateMissingProfile: Boolean(options.autoCreateMissingProfile),
    user: options.user || null,
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
  ensureStudentProfileForUser,
  findPlacementSnapshotTitleForStudent,
};
