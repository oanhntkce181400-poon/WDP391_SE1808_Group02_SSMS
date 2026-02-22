// registrationPeriod.service.js
// Service xử lý logic nghiệp vụ cho Registration Period

const RegistrationPeriod = require('../models/registrationPeriod.model');

/**
 * Tạo đợt đăng ký mới
 */
async function createRegistrationPeriod(payload, createdById) {
  const {
    periodName,
    startDate,
    endDate,
    allowedCohorts = [],
    description = '',
  } = payload;

  // Xác định status dựa vào thời gian
  const now = new Date();
  let status = 'upcoming';
  if (now >= new Date(startDate) && now <= new Date(endDate)) {
    status = 'active';
  } else if (now > new Date(endDate)) {
    status = 'closed';
  }

  // Tạo đợt đăng ký
  const period = await RegistrationPeriod.create({
    periodName,
    startDate,
    endDate,
    allowedCohorts,
    description,
    status,
    createdBy: createdById,
  });

  return await period.populate('createdBy', 'fullName email');
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

  // Lấy danh sách
  const periods = await RegistrationPeriod.find(query)
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
  const allowedUpdates = ['periodName', 'startDate', 'endDate', 'allowedCohorts', 'description'];

  allowedUpdates.forEach((field) => {
    if (payload[field] !== undefined) {
      period[field] = payload[field];
    }
  });

  period.updatedBy = updatedById;

  // Validate và save
  await period.save();

  return await period.populate('createdBy updatedBy', 'fullName email');
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
  const period = await RegistrationPeriod.findOne({ status: 'active' })
    .lean();

  return period;
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

module.exports = {
  createRegistrationPeriod,
  getRegistrationPeriods,
  getRegistrationPeriodById,
  updateRegistrationPeriod,
  togglePeriodStatus,
  deleteRegistrationPeriod,
  getCurrentActivePeriod,
  autoUpdatePeriodStatuses,
};
