// registrationPeriod.service.js
// Service xử lý logic nghiệp vụ cho Registration Period

const RegistrationPeriod = require('../models/registrationPeriod.model');
const mongoose = require('mongoose');

function throwValidationError400(error) {
  if (error && (error.name === 'ValidationError' || error.name === 'CastError')) {
    const firstFieldError = error.errors ? Object.values(error.errors)[0]?.message : null;
    const wrappedError = new Error(firstFieldError || error.message || 'Dữ liệu không hợp lệ');
    wrappedError.statusCode = 400;
    throw wrappedError;
  }

  throw error;
}

function normalizeSemesterId(payload = {}) {
  const rawSemesterId = payload.semesterId || payload.semester;
  if (!rawSemesterId) return undefined;
  if (!mongoose.Types.ObjectId.isValid(rawSemesterId)) {
    const error = new Error('Semester không hợp lệ');
    error.statusCode = 400;
    throw error;
  }
  return rawSemesterId;
}

/**
 * Tạo đợt đăng ký mới
 */
async function createRegistrationPeriod(payload, createdById) {
  const {
    periodName,
    requestType = 'all',
    startDate,
    endDate,
    allowedCohorts = [],
    description = '',
  } = payload;
  const normalizedSemesterId = normalizeSemesterId(payload);

  // Xác định status dựa vào thời gian
  const now = new Date();
  let status = 'upcoming';
  if (now >= new Date(startDate) && now <= new Date(endDate)) {
    status = 'active';
  } else if (now > new Date(endDate)) {
    status = 'closed';
  }

  // Tạo đợt đăng ký
  try {
    const period = await RegistrationPeriod.create({
      periodName,
      requestType,
      // Lưu semester dưới dạng ObjectId (nếu có)
      semester: normalizedSemesterId,
      startDate,
      endDate,
      allowedCohorts,
      description,
      status,
      createdBy: createdById,
    });

    return await period.populate('createdBy', 'fullName email');
  } catch (error) {
    throwValidationError400(error);
  }
}

/**
 * Lấy danh sách đợt đăng ký (có filter)
 */
async function getRegistrationPeriods(filters = {}) {
  const query = {};

  // Filter theo status
  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }

   // Filter theo semester
   if (filters.semesterId) {
     query.semester = filters.semesterId;
   }

  // Lấy danh sách
  const periods = await RegistrationPeriod.find(query)
    .populate('semester')
    .populate('createdBy updatedBy', 'fullName email')
    .sort({ startDate: -1 }) // Mới nhất lên đầu
    .lean();

  return periods;
}

/**
 * Lấy chi tiết một đợt đăng ký
 */
async function getRegistrationPeriodById(periodId) {
  const period = await RegistrationPeriod.findById(periodId)
    .populate('semester')
    .populate('createdBy updatedBy', 'fullName email')
    .lean();

  if (!period) {
    const error = new Error('Không tìm thấy đợt đăng ký');
    error.statusCode = 404;
    throw error;
  }

  return period;
}

/**
 * Cập nhật đợt đăng ký
 */
async function updateRegistrationPeriod(periodId, payload, updatedById) {
  const period = await RegistrationPeriod.findById(periodId);

  if (!period) {
    const error = new Error('Không tìm thấy đợt đăng ký');
    error.statusCode = 404;
    throw error;
  }

  // Không cho phép cập nhật nếu đã closed hoặc cancelled
  if (period.status === 'closed' || period.status === 'cancelled') {
    const error = new Error('Không thể cập nhật đợt đăng ký đã đóng hoặc đã hủy');
    error.statusCode = 400;
    throw error;
  }

  // Các field được phép cập nhật
  const allowedUpdates = [
    'periodName',
    'requestType',
    'startDate',
    'endDate',
    'allowedCohorts',
    'description',
  ];

  allowedUpdates.forEach((field) => {
    if (payload[field] !== undefined) {
      period[field] = payload[field];
    }
  });

  // Cập nhật semester nếu frontend gửi semesterId / semester hợp lệ
  if (payload.semesterId !== undefined || payload.semester !== undefined) {
    period.semester = normalizeSemesterId(payload);
  }

  period.updatedBy = updatedById;

  // Validate và save
  try {
    await period.save();
  } catch (error) {
    throwValidationError400(error);
  }

  return await period.populate('createdBy updatedBy', 'fullName email');
}

/**
 * Build payload cho realtime event theo sequence:
 * 1. checkCurrentRegistrationStatus()
 * 2. retrieveCurrentPeriod()
 */
async function buildRegistrationPeriodRealtimePayload(period) {
  const now = new Date();
  const currentPeriod = await getCurrentActivePeriod();

  // Nếu có period active ở thời điểm hiện tại thì coi như registration available
  const isRegistrationAvailable = !!currentPeriod;

  // Dùng status theo sequence để frontend phân nhánh hiển thị
  // - upcoming: chưa mở
  // - available: đang mở
  const registrationStatus = isRegistrationAvailable ? 'available' : 'upcoming';

  return {
    period,
    currentPeriod,
    checkedAt: now.toISOString(),
    registrationStatus,
    notificationType: isRegistrationAvailable
      ? 'registration-available'
      : 'registration-upcoming',
    message: isRegistrationAvailable
      ? 'Registration period is active now'
      : 'Registration period is updated but not open yet',
  };
}

/**
 * Toggle trạng thái active/closed cho đợt đăng ký
 */
async function togglePeriodStatus(periodId, newStatus) {
  const period = await RegistrationPeriod.findById(periodId);

  if (!period) {
    const error = new Error('Không tìm thấy đợt đăng ký');
    error.statusCode = 404;
    throw error;
  }

  // Validate status
  const validStatuses = ['upcoming', 'active', 'closed', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    const error = new Error('Trạng thái không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  period.status = newStatus;
  await period.save();

  return period;
}

/**
 * Xóa đợt đăng ký
 */
async function deleteRegistrationPeriod(periodId) {
  const period = await RegistrationPeriod.findById(periodId);

  if (!period) {
    const error = new Error('Không tìm thấy đợt đăng ký');
    error.statusCode = 404;
    throw error;
  }

  // Chỉ cho phép xóa nếu status là upcoming hoặc cancelled
  if (period.status === 'active' || period.status === 'closed') {
    const error = new Error('Không thể xóa đợt đăng ký đang hoạt động hoặc đã đóng');
    error.statusCode = 400;
    throw error;
  }

  await RegistrationPeriod.findByIdAndDelete(periodId);

  return { message: 'Xóa đợt đăng ký thành công' };
}

/**
 * Lấy đợt đăng ký đang active hiện tại
 */
async function getCurrentActivePeriod() {
  const now = new Date();
  const period = await RegistrationPeriod.findOne({
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .sort({ startDate: -1, createdAt: -1 })
    .lean();

  return period;
}

/**
 * Check cohort access for a registration period.
 * Empty allowedCohorts means all cohorts are allowed.
 */
function checkCohortAccess(studentCohort, periodAllowedCohorts = []) {
  if (!Array.isArray(periodAllowedCohorts) || periodAllowedCohorts.length === 0) {
    return {
      allowed: true,
      message: 'All cohorts are allowed in this period',
    };
  }

  const normalizedStudentCohort = Number(studentCohort);
  if (Number.isNaN(normalizedStudentCohort)) {
    return {
      allowed: false,
      message: 'Student cohort is missing or invalid',
      allowedCohorts: periodAllowedCohorts
        .map((c) => Number(c))
        .filter((c) => !Number.isNaN(c)),
    };
  }
  const normalizedAllowed = periodAllowedCohorts.map((c) => Number(c)).filter((c) => !Number.isNaN(c));
  const allowed = normalizedAllowed.includes(normalizedStudentCohort);

  return {
    allowed,
    message: allowed
      ? `Cohort K${normalizedStudentCohort} is allowed`
      : `Cohort K${normalizedStudentCohort} is not allowed`,
    allowedCohorts: normalizedAllowed,
  };
}

async function validateCurrentPeriodCohort(studentCohort) {
  const currentPeriod = await getCurrentActivePeriod();
  if (!currentPeriod) {
    return {
      hasActivePeriod: false,
      allowed: true,
      message: 'No active registration period configured',
      period: null,
    };
  }

  const cohortResult = checkCohortAccess(studentCohort, currentPeriod.allowedCohorts);
  return {
    hasActivePeriod: true,
    allowed: cohortResult.allowed,
    message: cohortResult.message,
    allowedCohorts: cohortResult.allowedCohorts || [],
    period: currentPeriod,
  };
}

/**
 * Cron job: Tự động cập nhật status của các đợt đăng ký
 * Gọi định kỳ mỗi 5 phút hoặc mỗi giờ
 */
async function autoUpdatePeriodStatuses() {
  const now = new Date();

  // Cập nhật upcoming -> active
  await RegistrationPeriod.updateMany(
    {
      status: 'upcoming',
      startDate: { $lte: now },
      endDate: { $gte: now },
    },
    { status: 'active' },
  );

  // Cập nhật active -> closed
  await RegistrationPeriod.updateMany(
    {
      status: 'active',
      endDate: { $lt: now },
    },
    { status: 'closed' },
  );

  console.log('[RegistrationPeriod] Auto-updated period statuses at', now);
}

/**
 * Kiểm tra xem hiện tại có đợt đăng ký phù hợp đang mở hay không
 * dùng cho từng loại đơn (repeat, overload, change_class, drop, all)
 *
 * Điều kiện mở:
 *  - now nằm trong khoảng [startDate, endDate]
 *  - status = 'active'
 *  - requestType khớp với tham số, hoặc period.requestType = 'all'
 *  - cohort sinh viên nằm trong allowedCohorts (nếu mảng này không rỗng)
 */
async function isRegistrationOpen(requestType, studentCohort) {
  // PSEUDOCODE (logic đơn giản):
  // 1. Lấy thời gian hiện tại (now)
  // 2. Tìm các RegistrationPeriod có:
  //      - status = 'active'
  //      - startDate <= now <= endDate
  //      - requestType nằm trong [requestType, 'all']
  // 3. Nếu không có period nào → trả về isOpen = false
  // 4. Với mỗi period tìm được:
  //      - Gọi checkCohortAccess(studentCohort, period.allowedCohorts)
  //      - Nếu allowed = true → trả về isOpen = true + thông tin period
  // 5. Nếu duyệt hết mà không period nào hợp lệ → isOpen = false

  const now = new Date();

  // Nếu không truyền requestType thì coi như 'all'
  const normalizedRequestType = requestType || 'all';

  // Lấy các period đang active, nằm trong khoảng thời gian hợp lệ
  const periods = await RegistrationPeriod.find({
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
    requestType: { $in: [normalizedRequestType, 'all'] },
  })
    .populate('semester')
    .lean();

  if (!periods || periods.length === 0) {
    return {
      isOpen: false,
      reason: 'NO_ACTIVE_PERIOD',
      message: 'No active registration period for this request type',
      period: null,
    };
  }

  // Nếu không có thông tin cohort, coi như không giới hạn theo cohort
  if (studentCohort === undefined || studentCohort === null || studentCohort === '') {
    return {
      isOpen: true,
      reason: 'OPEN_WITHOUT_COHORT_CHECK',
      message: 'Registration period is open (cohort not checked)',
      period: periods[0],
    };
  }

  // Duyệt từng period, check quyền theo cohort
  for (const period of periods) {
    const cohortResult = checkCohortAccess(studentCohort, period.allowedCohorts || []);
    if (cohortResult.allowed) {
      return {
        isOpen: true,
        reason: 'OPEN',
        message: cohortResult.message,
        period,
        cohortInfo: cohortResult,
      };
    }
  }

  // Không có period nào cho phép cohort này
  return {
    isOpen: false,
    reason: 'COHORT_NOT_ALLOWED',
    message: 'Student cohort is not allowed in any active period for this request type',
    period: null,
  };
}

/**
 * Lấy danh sách loại đơn đang mở để frontend hiển thị menu chọn nhanh.
 */
async function getOpenRequestTypeSummary(studentCohort) {
  const now = new Date();

  const periods = await RegistrationPeriod.find({
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .populate('semester')
    .sort({ startDate: 1, createdAt: -1 })
    .lean();

  // Nếu có truyền cohort thì lọc theo allowedCohorts
  const availablePeriods = (periods || []).filter((period) => {
    if (studentCohort === undefined || studentCohort === null || studentCohort === '') {
      return true;
    }

    return checkCohortAccess(studentCohort, period.allowedCohorts || []).allowed;
  });

  if (availablePeriods.length === 0) {
    return {
      isOpen: false,
      openTypes: [],
      periods: [],
    };
  }

  const hasAllType = availablePeriods.some((p) => p.requestType === 'all');

  const baseTypes = ['repeat', 'overload', 'change_class', 'drop'];
  const openTypes = hasAllType
    ? ['all', ...baseTypes]
    : Array.from(new Set(availablePeriods.map((p) => p.requestType))).filter(Boolean);

  return {
    isOpen: openTypes.length > 0,
    openTypes,
    periods: availablePeriods,
  };
}

module.exports = {
  createRegistrationPeriod,
  getRegistrationPeriods,
  getRegistrationPeriodById,
  updateRegistrationPeriod,
  togglePeriodStatus,
  deleteRegistrationPeriod,
  getCurrentActivePeriod,
  checkCohortAccess,
  validateCurrentPeriodCohort,
  buildRegistrationPeriodRealtimePayload,
  autoUpdatePeriodStatuses,
  isRegistrationOpen,
  getOpenRequestTypeSummary,
};
