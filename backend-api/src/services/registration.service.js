const ClassSection = require('../models/classSection.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const Schedule = require('../models/schedule.model');
const Semester = require('../models/semester.model');
const Student = require('../models/student.model');
const Timeslot = require('../models/timeslot.model');
const curriculumService = require('./curriculum.service');
const paymentValidationService = require('./paymentValidation.service');
const registrationPeriodService = require('./registrationPeriod.service');
const { getOrCreateWallet } = require('./wallet.service');

function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function isOverlapped(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

// Mọi rule trong trang đăng ký môn đều cần biết "đang xét học kỳ nào".
// Thứ tự ưu tiên:
// 1. semesterId FE truyền lên
// 2. nếu đang check theo class section thì suy ra semester từ class đó
// 3. fallback về học kỳ current của hệ thống
async function resolveSemester(semesterId, classSection) {
  if (semesterId) {
    return Semester.findById(semesterId).lean();
  }

  if (classSection?.semester && classSection?.academicYear) {
    const matchedSemester = await Semester.findOne({
      semesterNum: classSection.semester,
      academicYear: classSection.academicYear,
    }).lean();
    if (matchedSemester) return matchedSemester;
  }

  // Nếu không có class cụ thể, ưu tiên học kỳ được gắn trong đợt đăng ký đang mở.
  const currentPeriod = await registrationPeriodService.getCurrentActivePeriod();
  if (currentPeriod?.semester) {
    const periodSemester = await Semester.findById(currentPeriod.semester).lean();
    if (periodSemester) return periodSemester;
  }

  return Semester.findOne({ isCurrent: true }).lean();
}

// Lấy toàn bộ enrollment active/completed của sinh viên trong đúng học kỳ đang xét.
// Dữ liệu này được tái sử dụng cho:
// - overload limit
// - credit limit
// - schedule conflict
// - eligibility summary trên FE
async function getSemesterEnrollments(studentId, semester) {
  if (!semester) {
    return [];
  }

  return ClassEnrollment.find({
    student: studentId,
    status: { $in: ['enrolled', 'completed'] },
    courseFeeCleared: { $ne: false },
  })
    .populate({
      path: 'classSection',
      match: {
        semester: semester.semesterNum,
        academicYear: semester.academicYear,
      },
      populate: [
        {
          path: 'subject',
          select: 'subjectCode subjectName credits',
        },
        {
          path: 'timeslot',
          select: 'groupName startTime endTime startPeriod endPeriod',
        },
      ],
    })
    .lean();
}

function buildTimeslotKey(startPeriod, endPeriod) {
  const normalizedStart = Number(startPeriod);
  const normalizedEnd = Number(endPeriod);
  if (!Number.isFinite(normalizedStart) || !Number.isFinite(normalizedEnd)) {
    return null;
  }

  return `${normalizedStart}:${normalizedEnd}`;
}

function buildFallbackScheduleBlocks(classSection) {
  if (!classSection?.dayOfWeek || !classSection?.timeslot) {
    return [];
  }

  return [
    {
      dayOfWeek: classSection.dayOfWeek,
      startPeriod: Number(classSection.timeslot.startPeriod || 0) || null,
      endPeriod: Number(classSection.timeslot.endPeriod || 0) || null,
      startTime: classSection.timeslot.startTime || null,
      endTime: classSection.timeslot.endTime || null,
    },
  ];
}

function buildScheduleBlocks(classSection, schedules = [], timeslotByPeriodKey = new Map()) {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    return buildFallbackScheduleBlocks(classSection);
  }

  return schedules
    .map((schedule) => {
      const periodKey = buildTimeslotKey(schedule.startPeriod, schedule.endPeriod);
      const matchedTimeslot = periodKey ? timeslotByPeriodKey.get(periodKey) : null;
      const fallbackTimeslot =
        classSection?.timeslot &&
        Number(classSection.timeslot.startPeriod) === Number(schedule.startPeriod) &&
        Number(classSection.timeslot.endPeriod) === Number(schedule.endPeriod)
          ? classSection.timeslot
          : null;

      return {
        dayOfWeek: schedule.dayOfWeek,
        startPeriod: Number(schedule.startPeriod || 0) || null,
        endPeriod: Number(schedule.endPeriod || 0) || null,
        startTime: matchedTimeslot?.startTime || fallbackTimeslot?.startTime || null,
        endTime: matchedTimeslot?.endTime || fallbackTimeslot?.endTime || null,
      };
    })
    .filter((block) => block.dayOfWeek && (block.startPeriod || (block.startTime && block.endTime)));
}

function blocksOverlap(firstBlock, secondBlock) {
  if (!firstBlock || !secondBlock || firstBlock.dayOfWeek !== secondBlock.dayOfWeek) {
    return false;
  }

  const firstStartPeriod = Number(firstBlock.startPeriod || 0);
  const firstEndPeriod = Number(firstBlock.endPeriod || 0);
  const secondStartPeriod = Number(secondBlock.startPeriod || 0);
  const secondEndPeriod = Number(secondBlock.endPeriod || 0);
  const hasPeriodData =
    Number.isFinite(firstStartPeriod) &&
    Number.isFinite(firstEndPeriod) &&
    Number.isFinite(secondStartPeriod) &&
    Number.isFinite(secondEndPeriod) &&
    firstStartPeriod > 0 &&
    firstEndPeriod > 0 &&
    secondStartPeriod > 0 &&
    secondEndPeriod > 0;

  if (hasPeriodData) {
    return firstStartPeriod <= secondEndPeriod && secondStartPeriod <= firstEndPeriod;
  }

  const firstStartMinutes = timeToMinutes(firstBlock.startTime);
  const firstEndMinutes = timeToMinutes(firstBlock.endTime);
  const secondStartMinutes = timeToMinutes(secondBlock.startTime);
  const secondEndMinutes = timeToMinutes(secondBlock.endTime);

  if (
    firstStartMinutes == null ||
    firstEndMinutes == null ||
    secondStartMinutes == null ||
    secondEndMinutes == null
  ) {
    return false;
  }

  return isOverlapped(firstStartMinutes, firstEndMinutes, secondStartMinutes, secondEndMinutes);
}

function resolveEntityId(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value._id || value.id || null;
  }

  return value;
}

/** SV đã có enrollment (đang học / hoàn thành) đúng lớp học phần này — không cho đăng ký lại. */
async function checkEnrolledInClassSection(studentId, classSectionId) {
  if (!studentId || !classSectionId) {
    return { enrolled: false, enrollment: null };
  }
  const enrollment = await ClassEnrollment.findOne({
    student: studentId,
    classSection: classSectionId,
    status: { $in: ['enrolled', 'completed'] },
  })
    .select('_id status')
    .lean();
  return { enrolled: Boolean(enrollment), enrollment };
}

async function findSameSubjectEnrollmentInSemester(studentId, classSection) {
  const subjectId = resolveEntityId(classSection?.subject);
  if (!subjectId || !classSection?.semester || !classSection?.academicYear) {
    return null;
  }

  const siblingClassSections = await ClassSection.find({
    subject: subjectId,
    semester: classSection.semester,
    academicYear: classSection.academicYear,
  })
    .select('_id')
    .lean();

  const siblingIds = siblingClassSections
    .map((item) => item?._id)
    .filter((id) => String(id) !== String(classSection._id));

  if (siblingIds.length === 0) {
    return null;
  }

  return ClassEnrollment.findOne({
    student: studentId,
    classSection: { $in: siblingIds },
    status: { $in: ['enrolled', 'completed'] },
    courseFeeCleared: { $ne: false },
  })
    .populate({
      path: 'classSection',
      select: 'classCode className semester academicYear subject',
      populate: {
        path: 'subject',
        select: 'subjectCode subjectName',
      },
    })
    .lean();
}

async function hasSubjectEnrollmentHistory(studentId, subjectId) {
  const resolvedSubjectId = resolveEntityId(subjectId);
  if (!resolvedSubjectId) {
    return false;
  }

  const classSections = await ClassSection.find({ subject: resolvedSubjectId })
    .select('_id')
    .lean();
  const classSectionIds = classSections.map((item) => item._id);

  if (classSectionIds.length === 0) {
    return false;
  }

  const existingEnrollment = await ClassEnrollment.findOne({
    student: studentId,
    classSection: { $in: classSectionIds },
    status: { $in: ['enrolled', 'completed', 'dropped'] },
  })
    .select('_id')
    .lean();

  return Boolean(existingEnrollment);
}

async function getHistoricalSubjectIdSet(studentId) {
  const historicalEnrollments = await ClassEnrollment.find({
    student: studentId,
    status: { $in: ['completed', 'dropped'] },
  })
    .populate({
      path: 'classSection',
      select: 'subject',
      populate: {
        path: 'subject',
        select: '_id',
      },
    })
    .lean();

  return new Set(
    (historicalEnrollments || [])
      .map((enrollment) => resolveEntityId(enrollment?.classSection?.subject)?.toString())
      .filter(Boolean),
  );
}

async function resolveRegistrationWindow(student, classSection, overloadInfo, semester = null) {
  if (!classSection) {
    return {
      allowed: true,
      requestType: 'all',
      message: 'No class selected',
      period: null,
      reason: 'NO_CLASS_SELECTED',
    };
  }

  if (overloadInfo?.enrollingCourseIsOverload === true) {
    const result = await registrationPeriodService.isRegistrationOpen('overload', student.cohort, {
      semesterId: semester?._id || null,
      semesterNum: semester?.semesterNum || null,
      academicYear: semester?.academicYear || null,
    });
    return {
      allowed: result.isOpen === true,
      requestType: 'overload',
      message: result.message,
      period: result.period || null,
      reason: result.reason || null,
    };
  }

  const isRepeatCourse = await hasSubjectEnrollmentHistory(student._id, classSection.subject);
  if (isRepeatCourse) {
    const result = await registrationPeriodService.isRegistrationOpen('repeat', student.cohort, {
      semesterId: semester?._id || null,
      semesterNum: semester?.semesterNum || null,
      academicYear: semester?.academicYear || null,
    });
    return {
      allowed: result.isOpen === true,
      requestType: 'repeat',
      message: result.message,
      period: result.period || null,
      reason: result.reason || null,
    };
  }

  return {
    allowed: false,
    requestType: 'normal',
    message:
      'Môn thuộc chương trình hiện tại được xử lý bởi auto-enrollment. Màn này chỉ dùng cho học lại hoặc học vượt.',
    period: null,
    reason: 'AUTO_ENROLLMENT_MANAGED',
  };
}

// Xác định "bộ môn chuẩn" mà curriculum cho phép trong kỳ hiện tại của sinh viên.
// Đây là chìa khóa để phân biệt:
// - môn đúng chương trình học
// - môn ngoài chương trình -> overload
//
// Kỳ trong khung: resolveDisplayedCurriculumSemester (tính + điều chỉnh K26 / DB cũ).
async function getCurriculumSubjectIdSet(student, semester) {
  const curriculum = await curriculumService.getCurriculumForStudent({
    majorCode: student.majorCode,
    enrollmentYear: student.enrollmentYear,
    cohort: student.cohort,
  });

  if (!curriculum || !semester) {
    return {
      curriculum: null,
      subjectIdSet: new Set(),
      curriculumSemesterOrder: null,
    };
  }

  const curriculumSemesterOrder = await paymentValidationService.resolveDisplayedCurriculumSemester(
    student,
    { currentSystemSemester: semester },
  );

  const subjects = await curriculumService.getSubjectsBySemester(
    curriculum._id,
    curriculumSemesterOrder,
  );

  const subjectIdSet = new Set(
    (subjects || [])
      .map((item) => item?.subject?._id?.toString())
      .filter(Boolean),
  );

  return {
    curriculum,
    subjectIdSet,
    curriculumSemesterOrder,
  };
}

/**
 * Check Course Prerequisites
 *
 * Ý nghĩa nghiệp vụ:
 * - sinh viên chỉ được đăng ký môn mới nếu đã hoàn thành các môn tiên quyết
 * - điều kiện pass hiện tại là enrollment completed và grade >= 5
 *
 * Lưu ý:
 * - FE truyền classId, không truyền subjectCode trực tiếp
 * - service sẽ đi từ class -> subject -> prerequisites để check
 */
const validatePrerequisites = async (studentId, classId) => {
  const classSection = await ClassSection.findById(classId)
    .populate('subject')
    .exec();

  if (!classSection) {
    return {
      eligible: false,
      message: 'Class not found',
    };
  }

  const subject = classSection.subject;

  // Môn không có prerequisite thì pass ngay.
  if (!subject.prerequisites || subject.prerequisites.length === 0) {
    return {
      eligible: true,
      message: 'No prerequisites required',
    };
  }

  const completedEnrollments = await ClassEnrollment.find({
    student: studentId,
    status: 'completed',
    grade: { $gte: 5.0 },
  })
    .populate({
      path: 'classSection',
      populate: { path: 'subject' },
    })
    .exec();

  // Gom các subjectCode mà sinh viên đã học xong và đạt.
  const passedSubjectCodes = completedEnrollments
    .map((enrollment) => enrollment.classSection?.subject?.subjectCode)
    .filter(Boolean);

  const missingPrerequisites = [];
  for (const prereq of subject.prerequisites) {
    if (!passedSubjectCodes.includes(prereq.code)) {
      missingPrerequisites.push(prereq);
    }
  }

  // Chỉ cần thiếu 1 môn tiên quyết là chặn đăng ký.
  if (missingPrerequisites.length > 0) {
    return {
      eligible: false,
      message: `Missing prerequisites: ${missingPrerequisites.map((p) => p.name).join(', ')}`,
      missingPrerequisites,
    };
  }

  return {
    eligible: true,
    message: 'All prerequisites passed',
  };
};

/**
 * UC40 - Validate Class Capacity
 */
const validateClassCapacity = async (classId) => {
  const classSection = await ClassSection.findById(classId).exec();

  if (!classSection) {
    return {
      isFull: true,
      message: 'Class not found',
    };
  }

  const isFull = classSection.currentEnrollment >= classSection.maxCapacity;

  return {
    isFull,
    message: isFull ? 'Class is full' : 'Class available',
    current: classSection.currentEnrollment,
    max: classSection.maxCapacity,
  };
};

/**
 * UC33 - Validate Wallet Balance
 */
const validateWallet = async (studentId, classId) => {
  const student = await Student.findById(studentId).exec();
  if (!student) {
    return {
      isSufficient: false,
      message: 'Student not found',
    };
  }

  const classSection = await ClassSection.findById(classId)
    .populate('subject')
    .exec();

  if (!classSection) {
    return {
      isSufficient: false,
      message: 'Class not found',
    };
  }

  const subject = classSection.subject;
  const credits = Number(subject?.credits || 0);
  // 1 tín chỉ = 100đ (trên toàn bộ hệ thống)
  const totalFee = credits * 100;

  // Auto-create wallet for legacy accounts that do not have one yet.
  const wallet = await getOrCreateWallet(student.userId);

  const isSufficient = wallet.balance >= totalFee;

  return {
    isSufficient,
    message: isSufficient ? 'Sufficient balance' : 'Insufficient balance',
    currentBalance: wallet.balance,
    totalFee,
    credits,
  };
};

/**
 * UC91 - Prevent Schedule Conflicts
 * BR1: Không cho đăng ký 2 lớp trùng lịch
 * BR2: So sánh theo dayOfWeek, startTime, endTime
 * BR3: Phải validate trước khi confirm đăng ký
 */
const checkScheduleConflict = async (studentId, classSectionId, semesterId = null) => {
  const selectedClass = await ClassSection.findById(classSectionId)
    .populate('timeslot', 'startTime endTime groupName startPeriod endPeriod')
    .populate('subject', 'subjectCode subjectName')
    .lean();

  if (!selectedClass) {
    return {
      valid: false,
      hasConflict: true,
      message: 'Selected class section not found',
      conflicts: [],
    };
  }

  const semester = await resolveSemester(semesterId, selectedClass);
  const semesterEnrollments = await getSemesterEnrollments(studentId, semester);

  if (!Array.isArray(semesterEnrollments)) {
    return {
      valid: false,
      hasConflict: true,
      message: 'Cannot retrieve registered classes',
      conflicts: [],
    };
  }

  const existingClasses = semesterEnrollments
    .map((e) => e.classSection)
    .filter((cls) => cls && String(cls._id) !== String(classSectionId));

  const allClassIds = [selectedClass._id, ...existingClasses.map((cls) => cls._id)];
  const [scheduleDocs, activeTimeslots] = await Promise.all([
    Schedule.find({
      classSection: { $in: allClassIds },
      status: 'active',
    })
      .select('classSection dayOfWeek startPeriod endPeriod')
      .lean(),
    Timeslot.find({ status: 'active' })
      .select('groupName startTime endTime startPeriod endPeriod')
      .lean(),
  ]);

  const timeslotByPeriodKey = new Map(
    activeTimeslots
      .map((slot) => [buildTimeslotKey(slot.startPeriod, slot.endPeriod), slot])
      .filter(([key]) => Boolean(key)),
  );
  const schedulesByClassId = scheduleDocs.reduce((acc, item) => {
    const key = String(item.classSection);
    if (!acc.has(key)) {
      acc.set(key, []);
    }
    acc.get(key).push(item);
    return acc;
  }, new Map());

  const selectedBlocks = buildScheduleBlocks(
    selectedClass,
    schedulesByClassId.get(String(selectedClass._id)) || [],
    timeslotByPeriodKey,
  );

  if (selectedBlocks.length === 0) {
    return {
      valid: true,
      hasConflict: false,
      message: 'Selected class section has no schedule yet. Conflict check skipped.',
      selectedClass: {
        classId: selectedClass._id,
        classCode: selectedClass.classCode,
      },
      conflicts: [],
    };
  }

  const conflicts = [];

  for (const cls of existingClasses) {
    const classBlocks = buildScheduleBlocks(
      cls,
      schedulesByClassId.get(String(cls._id)) || [],
      timeslotByPeriodKey,
    );

    for (const selectedBlock of selectedBlocks) {
      const matchedConflict = classBlocks.find((classBlock) =>
        blocksOverlap(selectedBlock, classBlock),
      );

      if (matchedConflict) {
        conflicts.push({
          classId: cls._id,
          classCode: cls.classCode,
          className: cls.className,
          subjectCode: cls?.subject?.subjectCode,
          subjectName: cls?.subject?.subjectName,
          dayOfWeek: matchedConflict.dayOfWeek,
          startTime: matchedConflict.startTime,
          endTime: matchedConflict.endTime,
        });
        break;
      }
    }
  }

  if (conflicts.length > 0) {
    const primarySelectedBlock = selectedBlocks[0];
    return {
      valid: true,
      hasConflict: true,
      message: 'Schedule conflict detected. Please choose another class section.',
      selectedClass: {
        classId: selectedClass._id,
        classCode: selectedClass.classCode,
        dayOfWeek: primarySelectedBlock.dayOfWeek,
        startTime: primarySelectedBlock.startTime,
        endTime: primarySelectedBlock.endTime,
      },
      conflicts,
    };
  }

  const primarySelectedBlock = selectedBlocks[0];
  return {
    valid: true,
    hasConflict: false,
    message: 'No schedule conflict found',
    selectedClass: {
      classId: selectedClass._id,
      classCode: selectedClass.classCode,
      dayOfWeek: primarySelectedBlock.dayOfWeek,
      startTime: primarySelectedBlock.startTime,
      endTime: primarySelectedBlock.endTime,
    },
    conflicts: [],
  };
};

async function checkOverloadLimit(studentId, semesterId, classId = null) {
  // Rule overload hiện tại:
  // - tối đa 2 môn overload trong một kỳ
  // - overload = môn nằm ngoài curriculum semester hiện tại của sinh viên
  // - nếu enrollment trước đó đã đánh dấu isOverload=true thì cũng tính luôn
  const student = await Student.findById(studentId).lean();
  if (!student) {
    return {
      allowed: false,
      message: 'Student not found',
      currentOverloadCount: 0,
      projectedOverloadCount: 0,
      maxOverloadCourses: 2,
    };
  }

  const classSection = classId
    ? await ClassSection.findById(classId).populate('subject', 'subjectCode subjectName').lean()
    : null;

  const semester = await resolveSemester(semesterId, classSection);
  const semesterEnrollments = await getSemesterEnrollments(studentId, semester);
  const normalizedEnrollments = semesterEnrollments
    .filter((item) => item.classSection)
    .map((item) => ({
      ...item,
      subjectId: resolveEntityId(item.classSection?.subject)?.toString(),
    }));

  const { subjectIdSet } = await getCurriculumSubjectIdSet(student, semester);
  const historicalSubjectIdSet = await getHistoricalSubjectIdSet(studentId);

  // currentOverloadCount = số môn overload mà sinh viên đã đăng ký từ trước.
  const currentOverloadCount = normalizedEnrollments.filter((enrollment) => {
    if (enrollment.isOverload === true) return true;
    if (!subjectIdSet.size) return enrollment.isOverload === true;
    if (!enrollment.subjectId) return false;
    if (historicalSubjectIdSet.has(enrollment.subjectId)) return false;
    return !subjectIdSet.has(enrollment.subjectId);
  }).length;

  let projectedOverloadCount = currentOverloadCount;
  let enrollingCourseIsOverload = false;

  // Nếu FE đang kiểm tra cho một class cụ thể thì project thêm trạng thái của môn sắp đăng ký,
  // từ đó biết sau khi bấm Register thì có vượt quá 2 môn overload hay không.
  const selectedSubjectId = resolveEntityId(classSection?.subject)?.toString();
  if (selectedSubjectId) {
    const subjectId = selectedSubjectId;
    const alreadyEnrolled = normalizedEnrollments.some((e) => e.subjectId === subjectId);
    if (!alreadyEnrolled) {
      if (historicalSubjectIdSet.has(subjectId)) {
        enrollingCourseIsOverload = false;
      } else if (!subjectIdSet.size) {
        enrollingCourseIsOverload = false;
      } else {
        enrollingCourseIsOverload = !subjectIdSet.has(subjectId);
      }
      if (enrollingCourseIsOverload) {
        projectedOverloadCount += 1;
      }
    }
  }

  return {
    allowed: projectedOverloadCount <= 2,
    message:
      projectedOverloadCount > 2
        ? 'You have exceeded the overload limit (maximum 2 courses)'
        : 'Overload limit check passed',
    maxOverloadCourses: 2,
    currentOverloadCount,
    projectedOverloadCount,
    enrollingCourseIsOverload,
  };
}

async function checkCreditLimit(studentId, semesterId, newCredits = 0, maxCredits = 20) {
  // Rule credit:
  // - tính tổng tín chỉ đã có trong học kỳ hiện tại
  // - cộng thêm số tín chỉ của lớp sắp đăng ký
  // - nếu vượt maxCredits thì reject
  const normalizedMaxCredits = Number(maxCredits) > 0 ? Number(maxCredits) : 20;
  const normalizedNewCredits = Number(newCredits) > 0 ? Number(newCredits) : 0;

  const semester = await resolveSemester(semesterId, null);
  const semesterEnrollments = await getSemesterEnrollments(studentId, semester);

  const currentCredits = semesterEnrollments
    .filter((item) => item.classSection)
    .reduce((sum, enrollment) => sum + Number(enrollment.classSection?.subject?.credits || 0), 0);

  const projectedCredits = currentCredits + normalizedNewCredits;
  const allowed = projectedCredits <= normalizedMaxCredits;

  return {
    allowed,
    message: allowed
      ? 'Credit limit check passed'
      : `Credit limit exceeded (${projectedCredits}/${normalizedMaxCredits})`,
    currentCredits,
    newCredits: normalizedNewCredits,
    projectedCredits,
    maxCredits: normalizedMaxCredits,
  };
}

async function getStudentEligibilitySummary(studentId, classId = null, semesterId = null) {
  // Đây là API backend cho khối "Your limits" trên FE.
  // Nó gom 3 nhóm rule chính về một payload:
  // - overload
  // - credit
  // - cohort access
  //
  // FE dùng summary này để:
  // - vẽ progress bar tín chỉ
  // - hiện overload x/2
  // - hiện Cohort K...
  // - disable Register nếu một trong các rule fail
  const student = await Student.findById(studentId).lean();
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const classSection = classId
    ? await ClassSection.findById(classId).populate('subject', 'credits').lean()
    : null;

  const semester = await resolveSemester(semesterId, classSection);
  const overload = await checkOverloadLimit(studentId, semester?._id, classId);
  const registrationWindow = classSection
    ? await resolveRegistrationWindow(student, classSection, overload, semester)
    : {
        allowed: true,
        requestType: 'all',
        message: 'No class selected',
        period: null,
        reason: 'NO_CLASS_SELECTED',
      };
  const credit = await checkCreditLimit(
    studentId,
    semester?._id,
    classSection?.subject?.credits || 0,
    20,
  );
  const cohortAccess = await registrationPeriodService.validateCurrentPeriodCohort(student.cohort);
  const duplicateSubject = classSection
    ? await (async () => {
        const existingEnrollment = await findSameSubjectEnrollmentInSemester(studentId, classSection);
        if (!existingEnrollment) {
          return {
            allowed: true,
            message: 'No duplicate subject enrollment in this semester',
            existingEnrollment: null,
          };
        }

        return {
          allowed: false,
          message: `Bạn đã có lớp ${existingEnrollment.classSection?.classCode || ''} cho cùng môn trong học kỳ này.`,
          existingEnrollment: {
            enrollmentId: existingEnrollment._id,
            classId: existingEnrollment.classSection?._id || null,
            classCode: existingEnrollment.classSection?.classCode || null,
            subjectCode: existingEnrollment.classSection?.subject?.subjectCode || null,
            subjectName: existingEnrollment.classSection?.subject?.subjectName || null,
          },
        };
      })()
    : {
        allowed: true,
        message: 'No class selected',
        existingEnrollment: null,
      };

  return {
    student: {
      id: student._id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      cohort: student.cohort,
      majorCode: student.majorCode,
    },
    semester: semester
      ? {
          id: semester._id,
          code: semester.code,
          name: semester.name,
          semesterNum: semester.semesterNum,
          academicYear: semester.academicYear,
        }
      : null,
    limits: {
      overload,
      credit,
      cohortAccess,
      registrationWindow,
      duplicateSubject,
    },
    canRegister:
      overload.allowed &&
      credit.allowed &&
      registrationWindow.allowed &&
      duplicateSubject.allowed,
  };
}

/**
 * Helper: Verify prerequisite subjects passed
 */
const verifyPrerequisiteSubjects = async (studentId, prerequisites) => {
  const completedEnrollments = await ClassEnrollment.find({
    student: studentId,
    status: 'completed',
    grade: { $gte: 5.0 },
  })
    .populate({
      path: 'classSection',
      populate: { path: 'subject' },
    })
    .lean();

  const passedSubjectCodes = new Set(
    completedEnrollments
      .map((enrollment) => enrollment.classSection?.subject?.subjectCode)
      .filter(Boolean),
  );

  return prerequisites.map((prereq) => ({
    code: prereq.code,
    name: prereq.name,
    passed: passedSubjectCodes.has(prereq.code),
  }));
};

module.exports = {
  validatePrerequisites,
  validateClassCapacity,
  validateWallet,
  checkScheduleConflict,
  verifyPrerequisiteSubjects,
  checkOverloadLimit,
  checkCreditLimit,
  getStudentEligibilitySummary,
  hasSubjectEnrollmentHistory,
  checkEnrolledInClassSection,
};
