// request.service.js
// Service xử lý logic nghiệp vụ cho đơn từ sinh viên
// Tương ứng với RequestService trong class diagram
// Bao gồm: tạo đơn, lấy danh sách, cập nhật, hủy

const Request = require('../models/request.model');
const Student = require('../models/student.model');
const notificationEmailService = require('./notificationEmail.service');

// ─────────────────────────────────────────────────────────────
// HÀM TIỆN ÍCH NỘI BỘ (Private helpers)
// ─────────────────────────────────────────────────────────────

/**
 * Tìm sinh viên theo userId (sub từ JWT)
 * Ném lỗi nếu không tìm thấy
 */
async function findStudentByUserId(userId) {
  const User = require('../models/user.model');
  const user = await User.findById(userId).exec();
  if (!user) throw new Error('Không tìm thấy tài khoản người dùng');

  let student = await Student.findOne({ email: user.email }).exec();
  if (!student) {
    const numMatch = (user.email || '').match(/ce18(\d{4})/i);
    const studentCode = numMatch ? 'CE18' + numMatch[1] : 'CE18' + Math.floor(1000 + Math.random() * 8999);
    student = await Student.create({
      userId: user._id,
      email: user.email,
      fullName: user.fullName || user.name || 'Sinh viên',
      studentCode,
      cohort: '18',
      majorCode: 'CE',
      curriculumCode: 'CEK18',
      status: 'active',
      enrollmentYear: 2023,
    });
  }

  return student;
}

/**
 * Kiểm tra đơn có đúng chủ sở hữu không (ensureOwner)
 * Ném lỗi 403 nếu không phải chủ
 */
async function ensureOwner(requestDoc, student) {
  // So sánh student._id trong đơn với sinh viên hiện tại
  if (String(requestDoc.student) !== String(student._id)) {
    const err = new Error('Bạn không có quyền truy cập đơn này');
    err.statusCode = 403;
    throw err;
  }
}

/**
 * Kiểm tra đơn có đang ở trạng thái Pending không (ensurePending)
 * Ném lỗi 400 nếu đã được xử lý
 */
function ensurePending(requestDoc) {
  if (requestDoc.status !== 'Pending') {
    const err = new Error('Không thể chỉnh sửa đơn đã được xử lý');
    err.statusCode = 400;
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// CÁC HÀM SERVICE CHÍNH
// ─────────────────────────────────────────────────────────────

/**
 * Tạo đơn mới
 * @param {string} userId - ID user từ JWT token
 * @param {object} payload - Dữ liệu đơn từ form
 */
async function createRequest(userId, payload) {
  const student = await findStudentByUserId(userId);

  const newRequest = new Request({
    student: student._id,
    requestType: payload.requestType,
    startDate: payload.startDate || null,
    endDate: payload.endDate || null,
    relatedSubject: payload.relatedSubject || '',
    reason: payload.reason,
    attachments: payload.attachments || [],
    status: 'Pending',
  });

  await newRequest.save();
  return newRequest;
}

/**
 * Lấy danh sách đơn của sinh viên hiện tại
 * @param {string} userId - ID user từ JWT token
 */
async function getMyRequests(userId) {
  const student = await findStudentByUserId(userId);

  const requests = await Request.find({ student: student._id })
    .sort({ createdAt: -1 }) // Mới nhất lên đầu
    .exec();

  return requests;
}

/**
 * Lấy chi tiết một đơn (theo RequestRepository.findById)
 * @param {string} requestId
 * @param {string} userId - để kiểm tra quyền
 */
async function getRequestById(requestId, userId) {
  const student = await findStudentByUserId(userId);

  const requestDoc = await Request.findById(requestId).exec();
  if (!requestDoc) {
    const err = new Error('Không tìm thấy đơn');
    err.statusCode = 404;
    throw err;
  }

  await ensureOwner(requestDoc, student);
  return requestDoc;
}

/**
 * Cập nhật đơn (chỉ được khi Pending) - theo flow Update Request
 * @param {string} requestId
 * @param {string} userId
 * @param {object} payload - Các trường cần cập nhật
 */
async function updateRequest(requestId, userId, payload) {
  const student = await findStudentByUserId(userId);

  // Bước 1: Tìm đơn
  const requestDoc = await Request.findById(requestId).exec();
  if (!requestDoc) {
    const err = new Error('Không tìm thấy đơn');
    err.statusCode = 404;
    throw err;
  }

  // Bước 2: Kiểm tra quyền sở hữu (ensureOwner)
  await ensureOwner(requestDoc, student);

  // Bước 3: Kiểm tra trạng thái Pending (ensurePending)
  ensurePending(requestDoc);

  // Bước 4: Nếu có attachments mới thì xóa cũ, lưu mới
  // (Hiện tại dự án chưa tích hợp cloud storage thật nên chỉ thay thế mảng URL)
  if (payload.attachments && payload.attachments.length > 0) {
    // TODO: Nếu có CloudStorageService thật → gọi delete(requestDoc.attachments) ở đây
    // Hiện tại: chỉ ghi log nếu có URL cũ
    if (requestDoc.attachments.length > 0) {
      console.log('[RequestService] Xóa attachments cũ (chưa tích hợp cloud):', requestDoc.attachments);
    }
    requestDoc.attachments = payload.attachments;
  }

  // Bước 5: Cập nhật các trường được phép thay đổi
  if (payload.requestType !== undefined) requestDoc.requestType = payload.requestType;
  if (payload.startDate !== undefined) requestDoc.startDate = payload.startDate || null;
  if (payload.endDate !== undefined) requestDoc.endDate = payload.endDate || null;
  if (payload.relatedSubject !== undefined) requestDoc.relatedSubject = payload.relatedSubject;
  if (payload.reason !== undefined) requestDoc.reason = payload.reason;

  await requestDoc.save();
  return requestDoc;
}

/**
 * Hủy đơn (chỉ được khi Pending) - theo flow Cancel Request
 * @param {string} requestId
 * @param {string} userId
 */
async function cancelRequest(requestId, userId) {
  const student = await findStudentByUserId(userId);

  // Bước 1: Tìm đơn
  const requestDoc = await Request.findById(requestId).exec();
  if (!requestDoc) {
    const err = new Error('Không tìm thấy đơn');
    err.statusCode = 404;
    throw err;
  }

  // Bước 2: Kiểm tra quyền sở hữu
  await ensureOwner(requestDoc, student);

  // Bước 3: Kiểm tra trạng thái Pending
  ensurePending(requestDoc);

  // Bước 4: Cập nhật status → Cancelled
  requestDoc.status = 'Cancelled';
  await requestDoc.save();

  return requestDoc;
}

// ─────────────────────────────────────────────────────────────
// ADMIN: LẤY TẤT CẢ ĐƠN (có thể lọc theo status)
// ─────────────────────────────────────────────────────────────

/**
 * Lấy tất cả đơn trong hệ thống (dành cho admin/staff)
 * @param {object} filters - { status, keyword }
 */
async function getAllRequests(filters = {}) {
  // Xây dựng điều kiện lọc
  const query = {};

  // Lọc theo trạng thái nếu có
  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }

  // Lấy đơn kèm thông tin sinh viên (populate)
  const requests = await Request.find(query)
    .populate('student', 'studentCode fullName email majorCode') // Lấy thông tin sinh viên
    .sort({ createdAt: -1 }) // Mới nhất lên đầu
    .exec();

  return requests;
}

// ─────────────────────────────────────────────────────────────
// ADMIN: DUYỆT / TỪ CHỐI ĐƠN (reviewRequest)
// Cập nhật status → Approved / Rejected + staffNote
// Gửi email thông báo cho sinh viên
// ─────────────────────────────────────────────────────────────

/**
 * Admin duyệt hoặc từ chối đơn
 * @param {string} requestId
 * @param {string} newStatus - 'Approved' hoặc 'Rejected'
 * @param {string} staffNote - Ghi chú / lý do từ chối
 */
async function reviewRequest(requestId, newStatus, staffNote) {
  // Chỉ cho phép 2 trạng thái này
  const allowedStatuses = ['Approved', 'Rejected', 'Processing'];
  if (!allowedStatuses.includes(newStatus)) {
    const err = new Error('Trạng thái không hợp lệ. Chỉ được: Approved, Rejected, Processing');
    err.statusCode = 400;
    throw err;
  }

  // Tìm đơn
  const requestDoc = await Request.findById(requestId)
    .populate('student', 'fullName email userId')
    .exec();

  if (!requestDoc) {
    const err = new Error('Không tìm thấy đơn');
    err.statusCode = 404;
    throw err;
  }

  // Cập nhật trạng thái và ghi chú
  requestDoc.status = newStatus;
  requestDoc.staffNote = staffNote || '';
  await requestDoc.save();

  // Gửi email thông báo cho sinh viên theo template cấu hình
  try {
    const studentEmail = requestDoc.student?.email;
    const studentName = requestDoc.student?.fullName || 'Sinh viên';

    if (studentEmail) {
      await notificationEmailService.sendRequestStatusEmail({
        studentEmail,
        studentName,
        requestType: requestDoc.requestType,
        requestStatus: newStatus,
        processedBy: 'Phòng Công tác Sinh viên',
        responseNote: staffNote,
      });
    }
  } catch (emailErr) {
    // Lỗi gửi mail không làm hỏng API - chỉ log cảnh báo
    console.warn('[RequestService] Không gửi được email thông báo:', emailErr.message);
  }

  return requestDoc;
}

// Export tất cả các hàm để controller dùng
module.exports = {
  createRequest,
  getMyRequests,
  getRequestById,
  updateRequest,
  cancelRequest,
  // Admin
  getAllRequests,
  reviewRequest,
};
