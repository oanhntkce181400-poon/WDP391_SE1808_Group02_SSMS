const CourseWishlist = require('../../models/courseWishlist.model');
const Student = require('../../models/student.model');
const Subject = require('../../models/subject.model');
const Semester = require('../../models/semester.model');
const ClassSection = require('../../models/classSection.model');
const ClassEnrollment = require('../../models/classEnrollment.model');
const User = require('../../models/user.model');
const curriculumService = require('../../services/curriculum.service');
const paymentValidationService = require('../../services/paymentValidation.service');

function resolveAuthUserId(auth = {}) {
  return auth.sub || auth.id || auth._id || null;
}

async function resolveStudentFromUserId(userId) {
  if (!userId) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  let student = await Student.findOne({ userId }).lean();
  if (!student && user.email) {
    student = await Student.findOne({ email: String(user.email).toLowerCase() }).lean();
  }

  if (!student) {
    const error = new Error('Student profile not found');
    error.statusCode = 404;
    throw error;
  }

  if (!student.isActive || student.academicStatus !== 'enrolled') {
    const error = new Error('Student is not eligible to create wishlist');
    error.statusCode = 400;
    throw error;
  }

  return student;
}

async function assertSubjectEligibleForWishlist(studentId, subjectId) {
  const classSections = await ClassSection.find({ subject: subjectId }).select('_id').lean();
  const classSectionIds = classSections.map((item) => item._id);

  if (!classSectionIds.length) {
    // Subject has never been opened before, treat as "not learned yet" and allow.
    return;
  }

  const passedEnrollment = await ClassEnrollment.findOne({
    student: studentId,
    status: 'completed',
    grade: { $gte: 5 },
    classSection: { $in: classSectionIds },
  }).lean();

  if (passedEnrollment) {
    const error = new Error('Subject has already been passed and is not eligible for wishlist');
    error.statusCode = 400;
    throw error;
  }
}

async function getPlannedSubjectIdsForSemester(student, semester) {
  const curriculum = await curriculumService.getCurriculumForStudent({
    majorCode: student.majorCode,
    enrollmentYear: student.enrollmentYear,
    cohort: student.cohort,
  });

  if (!curriculum?._id) {
    return new Set();
  }

  const curriculumSemesterOrder = await paymentValidationService.calculateStudentCurriculumSemester(
    student,
    semester,
  );

  const curriculumSubjects = await curriculumService.getSubjectsBySemester(
    curriculum._id,
    curriculumSemesterOrder,
  );

  return new Set(
    (curriculumSubjects || [])
      .map((item) => item?.subject?._id?.toString())
      .filter(Boolean),
  );
}

async function getAssignedSubjectIdsForSemester(studentId, semester) {
  const semesterEnrollments = await ClassEnrollment.find({
    student: studentId,
    status: { $in: ['enrolled', 'completed'] },
  })
    .populate({
      path: 'classSection',
      match: {
        semester: semester.semesterNum,
        academicYear: semester.academicYear,
      },
      select: 'subject',
    })
    .lean();

  const assignedSubjectIds = semesterEnrollments
    .map((item) => {
      const subject = item?.classSection?.subject;
      if (!subject) return null;
      if (typeof subject === 'string') return subject;
      if (subject.toString) return subject.toString();
      return null;
    })
    .filter(Boolean);

  return new Set(assignedSubjectIds);
}

async function getWishlistSubjectIdsForSemester(studentId, semesterId) {
  const existingWishlist = await CourseWishlist.find({
    student: studentId,
    semester: semesterId,
    status: { $in: ['pending', 'approved'] },
  })
    .select('subject')
    .lean();

  return new Set(
    existingWishlist.map((item) => item?.subject?.toString()).filter(Boolean),
  );
}

async function assertMaxSubjectsPerSemester(student, semester, incomingSubjectId) {
  const breakdown = await getSemesterSubjectBreakdown(student, semester, incomingSubjectId);

  if (!breakdown.canAddSelectedSubject) {
    const error = new Error(
      `Subject limit exceeded for this semester. Maximum is 7 subjects (planned/assigned/wishlist). Current after adding: ${breakdown.distinctSubjectsAfterSelection}`,
    );
    error.statusCode = 400;
    error.details = {
      ...breakdown,
    };
    throw error;
  }
}

async function getSemesterSubjectBreakdown(student, semester, incomingSubjectId = null) {
  const [plannedSubjectIds, assignedSubjectIds, wishlistSubjectIds] = await Promise.all([
    getPlannedSubjectIdsForSemester(student, semester),
    getAssignedSubjectIdsForSemester(student._id, semester),
    getWishlistSubjectIdsForSemester(student._id, semester._id),
  ]);

  const distinctCurrentSubjectIds = new Set([
    ...plannedSubjectIds,
    ...assignedSubjectIds,
    ...wishlistSubjectIds,
  ]);

  const incomingId = incomingSubjectId ? String(incomingSubjectId) : null;
  const selectedSubjectAlreadyCounted = incomingId
    ? distinctCurrentSubjectIds.has(incomingId)
    : false;

  const distinctSubjectsAfterSelection = incomingId
    ? selectedSubjectAlreadyCounted
      ? distinctCurrentSubjectIds.size
      : distinctCurrentSubjectIds.size + 1
    : distinctCurrentSubjectIds.size;

  const maxSubjectsPerSemester = 7;

  return {
    maxSubjectsPerSemester,
    counts: {
      planned: plannedSubjectIds.size,
      assigned: assignedSubjectIds.size,
      wishlist: wishlistSubjectIds.size,
    },
    distinctSubjectsCurrent: distinctCurrentSubjectIds.size,
    distinctSubjectsAfterSelection,
    selectedSubjectAlreadyCounted,
    canAddSelectedSubject: distinctSubjectsAfterSelection <= maxSubjectsPerSemester,
  };
}

async function getSemesterBreakdownForStudent(userId, semesterId, incomingSubjectId = null) {
  const student = await resolveStudentFromUserId(userId);
  const semester = await Semester.findById(semesterId).lean();

  if (!semester) {
    const error = new Error('Semester not found');
    error.statusCode = 404;
    throw error;
  }

  const breakdown = await getSemesterSubjectBreakdown(student, semester, incomingSubjectId);

  return {
    semester: {
      _id: semester._id,
      code: semester.code,
      name: semester.name,
      semesterNum: semester.semesterNum,
      academicYear: semester.academicYear,
    },
    ...breakdown,
  };
}

async function createWishlist(userId, payload) {
  const { subjectId, semesterId, reason = '' } = payload;

  const student = await resolveStudentFromUserId(userId);

  const [subject, semester] = await Promise.all([
    Subject.findById(subjectId).lean(),
    Semester.findById(semesterId).lean(),
  ]);

  if (!subject) {
    const error = new Error('Subject not found');
    error.statusCode = 404;
    throw error;
  }

  if (!semester) {
    const error = new Error('Semester not found');
    error.statusCode = 404;
    throw error;
  }

  await assertSubjectEligibleForWishlist(student._id, subjectId);

  const duplicate = await CourseWishlist.findOne({
    student: student._id,
    subject: subjectId,
    semester: semesterId,
    status: { $in: ['pending', 'approved'] },
  }).lean();

  if (duplicate) {
    const error = new Error('You already have an active wishlist for this subject in selected semester');
    error.statusCode = 409;
    throw error;
  }

  await assertMaxSubjectsPerSemester(student, semester, subjectId);

  const created = await CourseWishlist.create({
    student: student._id,
    subject: subjectId,
    semester: semesterId,
    reason: String(reason || '').trim(),
  });

  return CourseWishlist.findById(created._id)
    .populate('subject', 'subjectCode subjectName credits')
    .populate('semester', 'code name semesterNum academicYear')
    .populate('enrolledClassSection', 'classCode className');
}

async function getMyWishlist(userId) {
  const student = await resolveStudentFromUserId(userId);

  return CourseWishlist.find({ student: student._id })
    .populate('subject', 'subjectCode subjectName credits')
    .populate('semester', 'code name semesterNum academicYear')
    .populate('enrolledClassSection', 'classCode className')
    .sort({ createdAt: -1 });
}

async function getWishlistBySemester(semesterId, query = {}) {
  const filter = { semester: semesterId };
  if (query.status) {
    filter.status = query.status;
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    CourseWishlist.find(filter)
      .populate('student', 'studentCode fullName email majorCode')
      .populate('subject', 'subjectCode subjectName credits')
      .populate('semester', 'code name semesterNum academicYear')
      .populate('enrolledClassSection', 'classCode className')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit),
    CourseWishlist.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function approveWishlist(id, reviewerUserId, payload = {}) {
  const wishlist = await CourseWishlist.findById(id)
    .populate('semester', 'semesterNum academicYear')
    .lean();

  if (!wishlist) {
    const error = new Error('Wishlist not found');
    error.statusCode = 404;
    throw error;
  }

  if (wishlist.status !== 'pending') {
    const error = new Error('Only pending wishlist can be approved');
    error.statusCode = 400;
    throw error;
  }

  let enrolledClassSection = null;
  if (payload.enrolledClassSection) {
    const classSection = await ClassSection.findById(payload.enrolledClassSection).lean();
    if (!classSection) {
      const error = new Error('Class section not found');
      error.statusCode = 404;
      throw error;
    }

    const sameSubject = String(classSection.subject) === String(wishlist.subject);
    const sameSemester =
      Number(classSection.semester) === Number(wishlist.semester?.semesterNum) &&
      String(classSection.academicYear) === String(wishlist.semester?.academicYear);

    if (!sameSubject || !sameSemester) {
      const error = new Error('Class section does not match wishlist subject or semester');
      error.statusCode = 400;
      throw error;
    }

    enrolledClassSection = classSection._id;
  }

  const updated = await CourseWishlist.findByIdAndUpdate(
    id,
    {
      status: 'approved',
      enrolledClassSection,
      reviewedBy: reviewerUserId || null,
      reviewedAt: new Date(),
      reviewNote: String(payload.note || '').trim(),
    },
    { new: true },
  )
    .populate('student', 'studentCode fullName email majorCode')
    .populate('subject', 'subjectCode subjectName credits')
    .populate('semester', 'code name semesterNum academicYear')
    .populate('enrolledClassSection', 'classCode className');

  return updated;
}

async function rejectWishlist(id, reviewerUserId, payload = {}) {
  const wishlist = await CourseWishlist.findById(id).lean();
  if (!wishlist) {
    const error = new Error('Wishlist not found');
    error.statusCode = 404;
    throw error;
  }

  if (wishlist.status !== 'pending') {
    const error = new Error('Only pending wishlist can be rejected');
    error.statusCode = 400;
    throw error;
  }

  const updated = await CourseWishlist.findByIdAndUpdate(
    id,
    {
      status: 'rejected',
      reviewedBy: reviewerUserId || null,
      reviewedAt: new Date(),
      reviewNote: String(payload.reason || payload.note || '').trim(),
      enrolledClassSection: null,
    },
    { new: true },
  )
    .populate('student', 'studentCode fullName email majorCode')
    .populate('subject', 'subjectCode subjectName credits')
    .populate('semester', 'code name semesterNum academicYear');

  return updated;
}

module.exports = {
  resolveAuthUserId,
  createWishlist,
  getMyWishlist,
  getSemesterBreakdownForStudent,
  getWishlistBySemester,
  approveWishlist,
  rejectWishlist,
};
