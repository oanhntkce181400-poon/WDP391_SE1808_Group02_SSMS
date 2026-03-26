// request.service.js
// Service xử lý logic nghiệp vụ cho đơn từ sinh viên
// Tương ứng với RequestService trong class diagram
// Bao gồm: tạo đơn, lấy danh sách, cập nhật, hủy

const Request = require('../models/request.model');
const Student = require('../models/student.model');

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

  // Gửi email thông báo cho sinh viên (nếu đã cấu hình mailer)
  try {
    const mailer = require('../external/mailer');
    const studentEmail = requestDoc.student?.email;
    const studentName = requestDoc.student?.fullName || 'Sinh viên';

    if (studentEmail) {
      // Tạo nội dung email dựa theo trạng thái
      const statusText = newStatus === 'Approved' ? 'ĐÃ DUYỆT ✅' : newStatus === 'Rejected' ? 'BỊ TỪ CHỐI ❌' : 'ĐANG XỬ LÝ 🔄';
      const subject = `[SSMS] Đơn từ "${requestDoc.requestType}" ${statusText}`;

      // Gọi hàm gửi mail chung (dùng lại transporter có sẵn)
      const transporter = mailer._getTransporter ? mailer._getTransporter() : null;
      if (transporter) {
        await transporter.sendMail({
          from: `SSMS Academic <${process.env.SMTP_USER}>`,
          to: studentEmail,
          subject,
          html: buildRequestResultEmail({ studentName, requestType: requestDoc.requestType, status: newStatus, statusText, staffNote }),
        });
      } else {
        // Mailer chưa cấu hình → chỉ log ra console
        console.log(`[RequestService] Email thông báo cho ${studentEmail}: ${subject}`);
        if (staffNote) console.log(`[RequestService] Nội dung phản hồi: ${staffNote}`);
      }
    }
  } catch (emailErr) {
    // Lỗi gửi mail không làm hỏng API - chỉ log cảnh báo
    console.warn('[RequestService] Không gửi được email thông báo:', emailErr.message);
  }

  return requestDoc;
}

// Hàm tạo HTML email thông báo kết quả đơn
function buildRequestResultEmail({ studentName, requestType, status, statusText, staffNote }) {
  const color = status === 'Approved' ? '#16a34a' : status === 'Rejected' ? '#dc2626' : '#2563eb';
  return `
    <div style="font-family: Inter, sans-serif; background: #f8fafc; padding: 32px;">
      <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: #1A237E; padding: 20px 28px;">
          <h1 style="color: #fff; margin: 0; font-size: 18px;">SSMS - Thông báo kết quả đơn từ</h1>
        </div>
        <div style="padding: 28px;">
          <p style="color: #334155;">Kính gửi <strong>${studentName}</strong>,</p>
          <p style="color: #334155;">Đơn từ <strong>"${requestType}"</strong> của bạn đã được xử lý:</p>
          <div style="background: #f1f5f9; border-left: 4px solid ${color}; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="color: ${color}; font-size: 18px; font-weight: 700; margin: 0;">${statusText}</p>
          </div>
          ${staffNote ? `<p style="color: #334155;"><strong>Ghi chú từ phòng CTSV:</strong><br/>${staffNote}</p>` : ''}
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Vui lòng đăng nhập vào hệ thống SSMS để xem chi tiết.</p>
        </div>
      </div>
    </div>
  `;
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
