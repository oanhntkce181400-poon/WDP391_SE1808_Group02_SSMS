const User = require('../models/user.model');
const Student = require('../models/student.model');
const ClassSection = require('../models/classSection.model');
require('../models/subject.model');
require('../models/room.model');
require('../models/teacher.model');
require('../models/timeslot.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const Schedule = require('../models/schedule.model');
const Attendance = require('../models/attendance.model');
const Timeslot = require('../models/timeslot.model');
const Room = require('../models/room.model');
const Semester = require('../models/semester.model');
const Curriculum = require('../models/curriculum.model');
const CurriculumSemester = require('../models/curriculumSemester.model');
const CurriculumCourse = require('../models/curriculumCourse.model');
const scheduleGenerator = require('../modules/schedule/scheduleGenerator.service');
const paymentValidation = require('./paymentValidation.service');

function getMondayOfWeek(dateInput) {
  const date = new Date(dateInput);
  const jsDay = date.getDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function validateWeekStart(weekStart) {
  if (!weekStart) return getMondayOfWeek(new Date());

  const date = new Date(weekStart);
  if (Number.isNaN(date.getTime())) {
    throw new Error('weekStart không hợp lệ, định dạng phải là YYYY-MM-DD');
  }
  return getMondayOfWeek(date);
}

function formatDateYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toStartOfDay(dateInput) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Lịch học của sinh viên cần hiển thị cả lớp đã được xếp lịch (`scheduled`)
 * vì luồng auto-enrollment đang gắn sinh viên vào các lớp này trước khi admin publish.
 */
const PUBLISHED_CLASS_STATUSES = ['scheduled', 'published', 'locked'];

function normalizeAcademicYearKey(ay) {
  return String(ay ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/\//g, '-');
}

function academicYearsMatch(a, b) {
  const na = normalizeAcademicYearKey(a);
  const nb = normalizeAcademicYearKey(b);
  if (!na || !nb) return false;
  return na === nb;
}

function yearBoundsFromAcademicYearString(ay) {
  const parts = String(ay || '')
    .split(/[-/]/)
    .map((p) => parseInt(p.trim(), 10))
    .filter((n) => !Number.isNaN(n));
  if (parts.length < 2) return null;
  const lo = Math.min(parts[0], parts[1]);
  const hi = Math.max(parts[0], parts[1]);
  return { lo, hi };
}

/**
 * Lớp có thể dùng năm học dạng khung CT (vd 2026-2030), kỳ hệ thống dạng 2026-2027 / 2025-2026.
 * Hai khoảng năm giao nhau → coi là cùng kỳ đào tạo.
 */
function academicYearCompatibleClassAndTeaching(classAy, teachingAy) {
  if (!classAy || !teachingAy) return false;
  if (academicYearsMatch(classAy, teachingAy)) return true;
  const cr = yearBoundsFromAcademicYearString(classAy);
  const tr = yearBoundsFromAcademicYearString(teachingAy);
  if (!cr || !tr) return false;
  if (tr.hi < cr.lo || tr.lo > cr.hi) return false;
  return true;
}

/**
 * Lớp đã đăng ký + đã công bố, ưu tiên khớp kỳ học vụ (HK + năm học).
 * Nới lỏng dần nếu dữ liệu năm học lệch format.
 */
function filterPublishedEnrollmentsForStudentTerm(classes, semCtx) {
  const pub = (c) => c && PUBLISHED_CLASS_STATUSES.includes(c.status);
  if (!Array.isArray(classes) || classes.length === 0) return [];

  const sn = semCtx?.semesterNum;
  const ay = semCtx?.academicYear;
  const yearOk = (c) =>
    ay != null &&
    String(ay).trim() !== '' &&
    academicYearCompatibleClassAndTeaching(c.academicYear, ay);

  const full = classes.filter(
    (c) =>
      pub(c) &&
      sn != null &&
      Number(c.semester) === Number(sn) &&
      yearOk(c),
  );
  if (full.length) return full;

  const byYear = classes.filter((c) => pub(c) && yearOk(c));
  if (byYear.length) return byYear;

  const bySem = classes.filter(
    (c) => pub(c) && sn != null && Number(c.semester) === Number(sn),
  );
  if (bySem.length) return bySem;

  return classes.filter(pub);
}

function resolveTimeslotForSchedule(sch, activeSlots) {
  if (!sch || !Array.isArray(activeSlots)) return null;
  const sp = Number(sch.startPeriod);
  const ep = Number(sch.endPeriod);
  const exact = activeSlots.find(
    (t) => Number(t.startPeriod) === sp && Number(t.endPeriod) === ep,
  );
  if (exact) return exact;

  const byStart = activeSlots.find((t) => Number(t.startPeriod) === sp);
  const byEnd =
    activeSlots.find((t) => Number(t.endPeriod) === ep) ||
    activeSlots.find((t) => Number(t.startPeriod) === ep);

  if (!byStart && !byEnd) return null;

  return {
    groupName: byStart?.groupName || byEnd?.groupName || null,
    startPeriod: Number.isFinite(sp) ? sp : Number(byStart?.startPeriod || 0),
    endPeriod: Number.isFinite(ep)
      ? ep
      : Number(byEnd?.endPeriod || byStart?.endPeriod || 0),
    startTime: byStart?.startTime || byEnd?.startTime || '',
    endTime: byEnd?.endTime || byStart?.endTime || '',
  };
}

async function findStudentByUser(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error('Không tìm thấy tài khoản người dùng');
  }

  let student = await Student.findOne({ userId: user._id }).lean();
  if (!student && user.email) {
    student = await Student.findOne({ email: String(user.email).toLowerCase() }).lean();
  }

  if (!student) {
    throw new Error('Không tìm thấy hồ sơ sinh viên');
  }

  return { user, student };
}

async function resolveStudentCurriculumContext(student) {
  let curriculumId = student.curriculumId || null;
  let curriculumSemester = Number(student.currentCurriculumSemester) || 1;

  if (!curriculumId) {
    const majorCode = String(student.majorCode || '').trim();
    const enrollmentYear = Number(student.enrollmentYear || student.cohort || 0);

    const yearRegex = enrollmentYear > 0 ? new RegExp(String(enrollmentYear)) : null;

    let curriculum = await Curriculum.findOne({
      major: majorCode,
      status: 'active',
      ...(yearRegex ? { academicYear: yearRegex } : {}),
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (!curriculum) {
      curriculum = await Curriculum.findOne({ major: majorCode, status: 'active' })
        .sort({ updatedAt: -1 })
        .lean();
    }

    if (curriculum) {
      curriculumId = curriculum._id;
      // Lưu ngược lại để lần sau không phải suy luận lại
      await Student.updateOne(
        { _id: student._id },
        {
          $set: {
            curriculumId: curriculum._id,
            currentCurriculumSemester: curriculumSemester,
          },
        },
      );
    }
  }

  return {
    curriculumId,
    curriculumSemester,
  };
}

function isDateRangeOverlapped(startA, endA, startB, endB) {
  const sa = startA ? new Date(startA).getTime() : null;
  const ea = endA ? new Date(endA).getTime() : null;
  const sb = startB ? new Date(startB).getTime() : null;
  const eb = endB ? new Date(endB).getTime() : null;

  if (sa == null || ea == null || sb == null || eb == null) return true;
  return sa <= eb && sb <= ea;
}

function buildItemFromLegacyClass(cls) {
  return {
    classId: cls._id,
    classCode: cls.classCode,
    className: cls.className,
    dayOfWeek: cls.dayOfWeek,
    startPeriod: cls.timeslot?.startPeriod || null,
    endPeriod: cls.timeslot?.endPeriod || null,
    startTime: cls.timeslot?.startTime || '',
    endTime: cls.timeslot?.endTime || '',
    timeslotName: cls.timeslot?.groupName || null,
    subject: {
      subjectCode: cls.subject?.subjectCode || 'N/A',
      subjectName: cls.subject?.subjectName || 'Chưa có tên',
    },
    room: {
      roomCode: cls.room?.roomCode || '',
      roomName: cls.room?.roomName || 'Chưa có phòng',
    },
    teacher: cls.teacher?.fullName || 'Chưa có GV',
    academicYear: cls.academicYear,
    semester: cls.semester,
  };
}

function buildItemFromSchedule(scheduleDoc, cls, timeslotHint = null) {
  const ts = timeslotHint || cls.timeslot;
  return {
    classId: cls._id,
    classCode: cls.classCode,
    className: cls.className,
    dayOfWeek: scheduleDoc.dayOfWeek,
    startPeriod: scheduleDoc.startPeriod || ts?.startPeriod || null,
    endPeriod: scheduleDoc.endPeriod || ts?.endPeriod || null,
    startTime: ts?.startTime || `P${scheduleDoc.startPeriod}`,
    endTime: ts?.endTime || `P${scheduleDoc.endPeriod}`,
    timeslotName: ts?.groupName || null,
    subject: {
      subjectCode: cls.subject?.subjectCode || 'N/A',
      subjectName: cls.subject?.subjectName || 'Chưa có tên',
    },
    room: {
      roomCode: scheduleDoc.room?.roomCode || cls.room?.roomCode || '',
      roomName: scheduleDoc.room?.roomName || cls.room?.roomName || 'Chưa có phòng',
    },
    teacher: cls.teacher?.fullName || 'Chưa có GV',
    academicYear: cls.academicYear,
    semester: cls.semester,
  };
}

const TuitionBill = require('../models/tuitionBill.model');

/**
 * Chặn xem TKB khi chưa đóng học phí kỳ khung — cùng nguồn với trang /student/payment (Payment + deadline).
 * Khác với checkTuitionBlock (chỉ TuitionBill), tránh SV vẫn thấy lịch dù chưa thanh toán kỳ curriculum.
 */
async function checkCurriculumScheduleBlock(student) {
  try {
    const semPay = await paymentValidation.checkSemesterPaymentRequirement(student._id);
    if (!semPay.mustPay) {
      return { blocked: false };
    }
    const overdueMsg =
      'Bạn đã không thanh toán học phí đúng hạn nên hiện không được xếp lớp. Vui lòng kiểm tra và theo dõi kỳ đăng ký mới được mở để đăng ký học lại.';
    const pendingMsg =
      'Bạn chưa thanh toán học phí kỳ hiện tại. Vui lòng thanh toán để xem thời khóa biểu và được xếp lớp chính thức.';
    return {
      blocked: true,
      message: semPay.isOverdue ? overdueMsg : pendingMsg,
      outstandingAmount: Math.max(0, Number(semPay.tuitionFee?.finalTuitionFee) || 0),
    };
  } catch (e) {
    console.warn('[checkCurriculumScheduleBlock]', e.message);
    return { blocked: false };
  }
}

/**
 * Kiểm tra sinh viên có bị chặn lịch học do chưa thanh toán học phí không.
 *
 * Chặn khi còn nợ (totalAmount > paidAmount) và một trong các điều kiện:
 * - Hạn thanh toán trên hóa đơn đã quá (dueDate) — đồng bộ trang học phí
 * - Đã qua mốc “1 tuần trước ngày khai giảng” kỳ (học phí phải đóng trước mốc đó)
 * - Kỳ đã bắt đầu hơn 7 ngày mà vẫn còn nợ (dự phòng)
 *
 * @param {Object} student - student document (lean)
 * @returns {Object} { blocked, message, outstandingAmount, semesterStartDate }
 */
async function checkTuitionBlock(student) {
  try {
    const unpaidBills = await TuitionBill.find({
      student: student._id,
      status: { $ne: 'cancelled' },
      $expr: { $gt: ['$totalAmount', '$paidAmount'] },
    })
      .populate('semester', 'startDate name')
      .lean();

    if (!unpaidBills.length) {
      return { blocked: false };
    }

    const now = new Date();
    const currentSemester = await Semester.findOne({ isCurrent: true }).lean();

    const msg =
      'Bạn chưa thanh toán học phí nên không thể xem lịch học. Vui lòng thanh toán sớm nhất có thể.';

    for (const bill of unpaidBills) {
      const outstandingAmount = bill.totalAmount - bill.paidAmount;
      if (outstandingAmount <= 0) continue;

      const semesterStart =
        bill.semester?.startDate != null
          ? new Date(bill.semester.startDate)
          : currentSemester?.startDate
            ? new Date(currentSemester.startDate)
            : null;

      const dueFuture = bill.dueDate && now <= new Date(bill.dueDate);

      // 1) Quá hạn theo hạn trên hóa đơn (đồng bộ “Đã quá hạn” trên UI học phí)
      if (bill.dueDate && now > new Date(bill.dueDate)) {
        return {
          blocked: true,
          message: msg,
          outstandingAmount,
          semesterName: bill.semester?.name || currentSemester?.name,
          semesterStartDate: semesterStart || undefined,
          dueDate: new Date(bill.dueDate),
        };
      }

      if (semesterStart) {
        const daysSinceStart = Math.floor(
          (now - semesterStart) / (1000 * 60 * 60 * 24),
        );

        // 2) Phải đóng trước mốc 1 tuần trước ngày khai giảng (không áp khi hạn trên bill còn trong tương lai)
        const preSemesterDeadline = new Date(semesterStart);
        preSemesterDeadline.setDate(preSemesterDeadline.getDate() - 7);
        preSemesterDeadline.setHours(0, 0, 0, 0);
        const nowDay = new Date(now);
        nowDay.setHours(0, 0, 0, 0);
        if (!dueFuture && nowDay > preSemesterDeadline) {
          return {
            blocked: true,
            message: msg,
            outstandingAmount,
            semesterName: bill.semester?.name || currentSemester?.name,
            semesterStartDate: semesterStart,
            daysOverdue: daysSinceStart,
          };
        }

        // 3) Kỳ đã bắt đầu hơn 7 ngày (chỉ khi không còn hạn tương lai trên hóa đơn)
        if (!dueFuture && daysSinceStart > 7) {
          return {
            blocked: true,
            message: msg,
            outstandingAmount,
            semesterName: bill.semester?.name || currentSemester?.name,
            semesterStartDate: semesterStart,
            daysOverdue: daysSinceStart,
          };
        }
      }
    }

    return { blocked: false };
  } catch (err) {
    console.warn('[checkTuitionBlock] Lỗi:', err.message);
    return { blocked: false };
  }
}

function buildItemFromCurriculumCourse(course, dayOfWeek, slot) {
  const subjectCode = course.subject?.subjectCode || course.subjectCode || 'N/A';
  const subjectName = course.subject?.subjectName || course.subjectName || 'Chưa có tên';

  return {
    classId: null,
    classCode: `CURR-${subjectCode}`,
    className: `${subjectName} (Theo khung chương trình)`,
    dayOfWeek,
    startPeriod: slot?.startPeriod || null,
    endPeriod: slot?.endPeriod || null,
    startTime: slot?.startTime || '',
    endTime: slot?.endTime || '',
    timeslotName: slot?.groupName || null,
    subject: {
      subjectCode,
      subjectName,
    },
    room: {
      roomCode: '',
      roomName: 'Sẽ phân khi mở lớp',
    },
    teacher: 'Sẽ phân công khi mở lớp',
    academicYear: null,
    semester: null,
    source: 'curriculum',
  };
}

async function buildCurriculumFallbackSchedule(student) {
  const { curriculumId, curriculumSemester } = await resolveStudentCurriculumContext(student);
  if (!curriculumId || !curriculumSemester) return [];

  let semesterDoc = await CurriculumSemester.findOne({
    curriculum: curriculumId,
    semesterOrder: Number(curriculumSemester),
  })
    .select('_id')
    .lean();

  // Fallback cho dữ liệu cũ bị lệch semesterOrder: tìm theo tên "Học kỳ X"
  if (!semesterDoc) {
    semesterDoc = await CurriculumSemester.findOne({
      curriculum: curriculumId,
      name: new RegExp(`${Number(curriculumSemester)}`),
    })
      .select('_id')
      .lean();
  }

  if (!semesterDoc) return [];

  const [courses, activeTimeslots] = await Promise.all([
    CurriculumCourse.find({ semester: semesterDoc._id })
      .populate('subject', 'subjectCode subjectName')
      .select('subject subjectCode subjectName')
      .lean(),
    Timeslot.find({ status: 'active' })
      .select('groupName startTime endTime startPeriod endPeriod')
      .sort({ startPeriod: 1, startTime: 1 })
      .lean(),
  ]);

  if (courses.length === 0 || activeTimeslots.length === 0) return [];

  // Ưu tiên ca ban ngày (Ca1-Ca4) để lịch học thực tế hơn
  const daytimeSlots = activeTimeslots.filter((slot) => {
    const startPeriod = Number(slot.startPeriod || 0);
    if (startPeriod > 0) return startPeriod <= 8;
    const startHour = Number(String(slot.startTime || '00:00').split(':')[0]);
    return startHour < 17;
  });

  const baseSlots = daytimeSlots.length > 0 ? daytimeSlots : activeTimeslots;
  const slotsPerDay = baseSlots.slice(0, 2);
  if (slotsPerDay.length === 0) return [];

  const daySequence = [1, 2, 3, 4, 5, 6];
  const maxPerWeek = daySequence.length * slotsPerDay.length;

  // Lấp đủ khung tuần bằng cách lặp vòng môn học trong kỳ
  const repeatedCourses = Array.from({ length: maxPerWeek }, (_, idx) => courses[idx % courses.length]);

  return repeatedCourses.map((course, idx) => {
    const dayIndex = Math.floor(idx / slotsPerDay.length);
    const slotIndex = idx % slotsPerDay.length;
    const dayOfWeek = daySequence[dayIndex] || daySequence[daySequence.length - 1];
    const slot = slotsPerDay[slotIndex];
    return buildItemFromCurriculumCourse(course, dayOfWeek, slot);
  });
}

function pickAcademicYearByDate(dateInput = new Date()) {
  const d = new Date(dateInput);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (m >= 8) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

function timeToMinutes(timeText) {
  const raw = String(timeText || '');
  const [h, m] = raw.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

function overlapByTime(a, b) {
  if (Number(a.dayOfWeek) !== Number(b.dayOfWeek)) return false;
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  if (aStart < 0 || aEnd < 0 || bStart < 0 || bEnd < 0) return false;
  return aStart < bEnd && bStart < aEnd;
}

function normalizeClassSlots(classRows) {
  return classRows
    .map((cls) => ({
      classId: cls._id,
      subjectId: cls.subject?._id || cls.subject,
      dayOfWeek: cls.dayOfWeek,
      startTime: cls.timeslot?.startTime || '',
      endTime: cls.timeslot?.endTime || '',
      currentEnrollment: Number(cls.currentEnrollment || 0),
      maxCapacity: Number(cls.maxCapacity || 0),
    }))
    .filter((x) => x.dayOfWeek && x.startTime && x.endTime);
}

function isReasonableStudyTime(timeText) {
  const m = timeToMinutes(timeText);
  if (m < 0) return false;
  const hour = Math.floor(m / 60);
  return hour >= 6 && hour <= 22;
}

async function resolveTeachingSemesterContext(student, curriculumSemesterOrder) {
  const currentSemester = await Semester.findOne({ isCurrent: true, isActive: true }).lean();
  if (currentSemester) {
    return {
      semesterNum: currentSemester.semesterNum,
      academicYear: currentSemester.academicYear,
      startDate: currentSemester.startDate || null,
      endDate: currentSemester.endDate || null,
    };
  }

  return {
    semesterNum: Number(curriculumSemesterOrder) || 1,
    academicYear: pickAcademicYearByDate(new Date()),
    startDate: null,
    endDate: null,
  };
}

async function ensureAutoProvisionedEnrollmentForStudent(student) {
  const { curriculumId, curriculumSemester } = await resolveStudentCurriculumContext(student);
  if (!curriculumId || !curriculumSemester) return;

  let semesterDoc = await CurriculumSemester.findOne({
    curriculum: curriculumId,
    semesterOrder: Number(curriculumSemester),
  }).lean();

  if (!semesterDoc) {
    semesterDoc = await CurriculumSemester.findOne({
      curriculum: curriculumId,
      name: new RegExp(`${Number(curriculumSemester)}`),
    }).lean();
  }

  if (!semesterDoc) return;

  const courses = await CurriculumCourse.find({ semester: semesterDoc._id })
    .select('subject')
    .lean();
  const subjectIds = courses.map((c) => c.subject).filter(Boolean);
  if (subjectIds.length === 0) return;

  const semCtx = await resolveTeachingSemesterContext(student, curriculumSemester);

  const existingEnrollments = await ClassEnrollment.find({
    student: student._id,
    status: 'enrolled',
    courseFeeCleared: { $ne: false },
  })
    .populate({
      path: 'classSection',
      match: {
        semester: semCtx.semesterNum,
        status: { $in: ['scheduled', 'published', 'locked'] },
      },
      populate: {
        path: 'timeslot',
        select: 'startTime endTime',
      },
    })
    .lean();

  const enrolledClassRows = existingEnrollments.map((e) => e.classSection).filter(Boolean);
  const invalidEnrollments = existingEnrollments.filter((e) => {
    const cls = e.classSection;
    if (!cls) return false;
    const st = cls.timeslot?.startTime;
    const et = cls.timeslot?.endTime;
    if (!st || !et) return false;
    return !isReasonableStudyTime(st) || !isReasonableStudyTime(et);
  });

  if (invalidEnrollments.length > 0) {
    await ClassEnrollment.deleteMany({ _id: { $in: invalidEnrollments.map((e) => e._id) } });
    for (const e of invalidEnrollments) {
      const cid = e.classSection?._id;
      if (!cid) continue;
      const enrolledCount = await ClassEnrollment.countDocuments({
        classSection: cid,
        status: 'enrolled',
      });
      await ClassSection.updateOne({ _id: cid }, { $set: { currentEnrollment: enrolledCount } });
    }
  }

  const validEnrolledClassRows = enrolledClassRows.filter((cls) => {
    const st = cls.timeslot?.startTime;
    const et = cls.timeslot?.endTime;
    if (!st || !et) return true;
    return isReasonableStudyTime(st) && isReasonableStudyTime(et);
  });

  const enrolledSubjectSet = new Set(
    validEnrolledClassRows.map((c) => String(c.subject?._id || c.subject)).filter(Boolean),
  );

  const missingSubjectIds = subjectIds.filter((sid) => !enrolledSubjectSet.has(String(sid)));

  if (missingSubjectIds.length > 0) {
    const [rooms, timeslots] = await Promise.all([
      Room.find({ status: 'available' }).select('_id').lean(),
      Timeslot.find({ status: 'active' })
        .select('_id startPeriod startTime endTime')
        .lean(),
    ]);

    const daytimeTimeslots = timeslots.filter((t) => {
      const sp = Number(t.startPeriod || 0);
      const start = String(t.startTime || '');
      const end = String(t.endTime || '');
      const validFormat = /^\d{1,2}:\d{2}$/.test(start) && /^\d{1,2}:\d{2}$/.test(end);
      return validFormat && sp > 0 && sp <= 8;
    });

    const candidateTimeslots = daytimeTimeslots.length > 0 ? daytimeTimeslots : timeslots;

    if (rooms.length > 0 && candidateTimeslots.length > 0) {
      try {
        await scheduleGenerator.autoGenerateTimetables({
          semester: semCtx.semesterNum,
          academicYear: semCtx.academicYear,
          subjectIds: missingSubjectIds,
          expectedEnrollment: 40,
          availableRooms: rooms.map((r) => r._id),
          availableTimeSlots: candidateTimeslots.map((t) => t._id),
          startDate: semCtx.startDate,
          endDate: semCtx.endDate,
        });
      } catch (err) {
        // Keep silent for student-facing flow; unassigned subjects will stay in curriculum fallback.
      }
    }
  }

  const rawCandidateClasses = await ClassSection.find({
    subject: { $in: subjectIds },
    semester: semCtx.semesterNum,
    status: { $in: ['scheduled', 'published', 'locked'] },
  })
    .populate('timeslot', 'startTime endTime')
    .sort({ currentEnrollment: 1, classCode: 1 })
    .lean();

  const termMatched = rawCandidateClasses.filter((cls) =>
    academicYearCompatibleClassAndTeaching(cls.academicYear, semCtx.academicYear),
  );

  const candidateClasses = termMatched.filter((cls) => {
    const st = cls.timeslot?.startTime;
    const et = cls.timeslot?.endTime;
    if (!st || !et) {
      return PUBLISHED_CLASS_STATUSES.includes(cls.status);
    }
    return isReasonableStudyTime(st) && isReasonableStudyTime(et);
  });

  const selectedSlots = normalizeClassSlots(validEnrolledClassRows);
  const selectedClassIds = new Set(validEnrolledClassRows.map((c) => String(c._id)));

  for (const sid of subjectIds) {
    const already = validEnrolledClassRows.find((c) => String(c.subject?._id || c.subject) === String(sid));
    if (already) continue;

    const subjectCandidates = candidateClasses.filter(
      (cls) => String(cls.subject?._id || cls.subject) === String(sid),
    );

    let picked = null;
    for (const cls of subjectCandidates) {
      if (selectedClassIds.has(String(cls._id))) continue;
      if (Number(cls.currentEnrollment || 0) >= Number(cls.maxCapacity || 0)) continue;

      const slot = {
        classId: cls._id,
        subjectId: sid,
        dayOfWeek: cls.dayOfWeek,
        startTime: cls.timeslot?.startTime,
        endTime: cls.timeslot?.endTime,
      };

      const conflict = selectedSlots.some((s) => overlapByTime(s, slot));
      if (conflict) continue;

      picked = cls;
      break;
    }

    if (!picked) continue;

    await ClassEnrollment.updateOne(
      { classSection: picked._id, student: student._id },
      {
        $set: { status: 'enrolled' },
        $setOnInsert: { enrollmentDate: new Date() },
      },
      { upsert: true },
    );

    const enrolledCount = await ClassEnrollment.countDocuments({
      classSection: picked._id,
      status: 'enrolled',
    });
    await ClassSection.updateOne({ _id: picked._id }, { $set: { currentEnrollment: enrolledCount } });

    selectedClassIds.add(String(picked._id));
    selectedSlots.push({
      classId: picked._id,
      subjectId: sid,
      dayOfWeek: picked.dayOfWeek,
      startTime: picked.timeslot?.startTime,
      endTime: picked.timeslot?.endTime,
    });
  }
}

function dateFromWeekStart(weekStartDate, dayOfWeek) {
  const d = new Date(weekStartDate);
  d.setDate(d.getDate() + Number(dayOfWeek) - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function ymdFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function attachAttendanceStatus(items, studentId, weekStartDate, weekEndDate) {
  const classIds = items
    .map((item) => item.classId)
    .filter(Boolean);

  if (classIds.length === 0) return items;
  const today = toStartOfDay(new Date());

  const records = await Attendance.find({
    student: studentId,
    classSection: { $in: classIds },
    slotDate: { $gte: weekStartDate, $lte: weekEndDate },
  })
    .select('classSection slotId slotDate status')
    .lean();

  const bySlotId = new Map();
  const byDate = new Map();

  for (const rec of records) {
    const classId = String(rec.classSection);
    const normalizedStatus = String(rec.status || '').toLowerCase() === 'late'
      ? 'present'
      : String(rec.status || '').toLowerCase();
    if (rec.slotId) {
      bySlotId.set(`${classId}|${String(rec.slotId).trim()}`, normalizedStatus);
    }
    if (rec.slotDate) {
      const key = `${classId}|${ymdFromDate(new Date(rec.slotDate))}`;
      byDate.set(key, normalizedStatus);
    }
  }

  return items.map((item) => {
    if (!item.classId) return item;

    const classId = String(item.classId);
    const classDate = dateFromWeekStart(weekStartDate, item.dayOfWeek);
    const classDateKey = ymdFromDate(classDate);

    const status =
      bySlotId.get(`${classId}|${classDateKey}`) ||
      byDate.get(`${classId}|${classDateKey}`) ||
      (classDate <= today ? 'absent' : null);

    return {
      ...item,
      attendanceStatus: status,
    };
  });
}

function itemSubjectCode(item) {
  return String(item?.subject?.subjectCode || '').trim().toUpperCase();
}

function itemSlotKey(item) {
  return `${Number(item.dayOfWeek || 0)}|${String(item.startTime || '')}|${String(item.endTime || '')}`;
}

function mergeCurriculumItemsIntoSchedule(existingItems, curriculumItems) {
  if (!Array.isArray(curriculumItems) || curriculumItems.length === 0) return existingItems;

  const usedSubjectCodes = new Set(existingItems.map(itemSubjectCode).filter(Boolean));
  const occupiedCells = new Set(existingItems.map(itemSlotKey));

  const merged = [...existingItems];
  for (const item of curriculumItems) {
    const code = itemSubjectCode(item);
    if (code && usedSubjectCodes.has(code)) continue;

    const key = itemSlotKey(item);
    if (occupiedCells.has(key)) continue;

    merged.push(item);
    if (code) usedSubjectCodes.add(code);
    occupiedCells.add(key);
  }

  return merged;
}

async function getMyWeekSchedule(userId, weekStart) {
  const weekStartDate = validateWeekStart(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);

  const { student } = await findStudentByUser(userId);

  // ── Lấy danh sách học phần đã đăng ký TRƯỚC khi kiểm tra chặn học phí ──
  // Luôn trả về danh sách học phần đã enrolled, kể cả khi bị chặn xem lịch tuần
  const semCtx = await resolveTeachingSemesterContext(
    student,
    Number(student.currentCurriculumSemester) || 1,
  );

  const enrollments = await ClassEnrollment.find({
    student: student._id,
    status: 'enrolled',
    courseFeeCleared: { $ne: false },
  })
    .populate({
      path: 'classSection',
      populate: [
        { path: 'subject', select: 'subjectCode subjectName credits' },
        { path: 'room', select: 'roomCode roomName' },
        { path: 'teacher', select: 'fullName' },
        { path: 'timeslot', select: 'startTime endTime startPeriod endPeriod groupName' },
      ],
    })
    .lean();

  const rawClasses = enrollments.map((e) => e.classSection).filter(Boolean);
  const enrolledClasses = filterPublishedEnrollmentsForStudentTerm(rawClasses, semCtx);

  // ── Bây giờ mới kiểm tra chặn học phí ──
  const curriculumBlock = await checkCurriculumScheduleBlock(student);
  if (curriculumBlock.blocked) {
    return {
      weekStart: formatDateYmd(weekStartDate),
      weekEnd: formatDateYmd(weekEndDate),
      currentTerm: {
        semesterNum: semCtx?.semesterNum || null,
        academicYear: semCtx?.academicYear || null,
      },
      schedules: [],
      enrolledClasses,
      paymentRequired: true,
      tuitionBlock: {
        message: curriculumBlock.message,
        outstandingAmount: curriculumBlock.outstandingAmount,
      },
    };
  }

  // ── Chặn lịch học nếu chưa thanh toán học phí sau 7 ngày kể từ khi kỳ bắt đầu (TuitionBill) ──
  const tuitionBlock = await checkTuitionBlock(student);
  if (tuitionBlock.blocked) {
    return {
      weekStart: formatDateYmd(weekStartDate),
      weekEnd: formatDateYmd(weekEndDate),
      currentTerm: {
        semesterNum: semCtx?.semesterNum || null,
        academicYear: semCtx?.academicYear || null,
      },
      schedules: [],
      enrolledClasses,
      paymentRequired: true,
      tuitionBlock: {
        message: tuitionBlock.message,
        outstandingAmount: tuitionBlock.outstandingAmount,
        semesterName: tuitionBlock.semesterName,
        semesterStartDate: tuitionBlock.semesterStartDate,
        daysOverdue: tuitionBlock.daysOverdue,
      },
    };
  }

  try {
    await ensureAutoProvisionedEnrollmentForStudent(student);
  } catch (e) {
    console.warn('[getMyWeekSchedule] ensureAutoProvisionedEnrollmentForStudent:', e?.message || e);
  }

  if (enrolledClasses.length === 0) {
    return {
      weekStart: formatDateYmd(weekStartDate),
      weekEnd: formatDateYmd(weekEndDate),
      currentTerm: {
        semesterNum: semCtx?.semesterNum || null,
        academicYear: semCtx?.academicYear || null,
        startDate: semCtx?.startDate || null,
        endDate: semCtx?.endDate || null,
      },
      schedules: [],
      enrolledClasses: [],
    };
  }

  const classIds = enrolledClasses.map((cls) => cls._id);
  const [schedules, activeSlots] = await Promise.all([
    Schedule.find({
      classSection: { $in: classIds },
      status: 'active',
      startDate: { $lte: weekEndDate },
      endDate: { $gte: weekStartDate },
    })
      .populate('room', 'roomCode roomName')
      .lean(),
    Timeslot.find({ status: 'active' })
      .select('startPeriod endPeriod startTime endTime groupName')
      .lean(),
  ]);

  const schedulesByClass = new Map();
  for (const sch of schedules) {
    const key = String(sch.classSection);
    if (!schedulesByClass.has(key)) schedulesByClass.set(key, []);
    schedulesByClass.get(key).push(sch);
  }

  const items = [];
  for (const cls of enrolledClasses) {
    const key = String(cls._id);
    const classSchedules = schedulesByClass.get(key) || [];
    for (const sch of classSchedules) {
      const slotHint = resolveTimeslotForSchedule(sch, activeSlots);
      items.push(buildItemFromSchedule(sch, cls, slotHint));
    }
  }

  items.sort((a, b) => {
    if ((a.dayOfWeek || 0) !== (b.dayOfWeek || 0)) return (a.dayOfWeek || 0) - (b.dayOfWeek || 0);
    return String(a.startTime || '').localeCompare(String(b.startTime || ''));
  });

  const itemsWithAttendance = await attachAttendanceStatus(
    items,
    student._id,
    weekStartDate,
    weekEndDate,
  );

  return {
    weekStart: formatDateYmd(weekStartDate),
    weekEnd: formatDateYmd(weekEndDate),
    currentTerm: {
      semesterNum: semCtx?.semesterNum || null,
      academicYear: semCtx?.academicYear || null,
      startDate: semCtx?.startDate || null,
      endDate: semCtx?.endDate || null,
    },
    schedules: itemsWithAttendance,
    enrolledClasses,
  };
}

module.exports = {
  getMyWeekSchedule,
  ensureAutoProvisionedEnrollmentForStudent,
};
