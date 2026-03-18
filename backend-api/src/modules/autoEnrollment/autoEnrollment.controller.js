const service = require('./autoEnrollment.service');

// Chuẩn hóa danh sách mã ngành / mã sinh viên từ request.
// Controller chấp nhận cả array lẫn string vì FE hoặc người gọi API có thể nhập:
// - ["SE", "AI"]
// - "SE, AI; BA"
// - "SE\nAI\nBA"
// Sau khi normalize, service luôn nhận được mảng code đã trim, uppercase và loại trùng.
function normalizeCodeList(value) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => String(item || '').trim().toUpperCase())
          .filter(Boolean),
      ),
    );
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          // Regex /[\s,;\n]+/ tách chuỗi theo:
          // - khoảng trắng (\s)
          // - dấu phẩy (,)
          // - dấu chấm phẩy (;)
          // - xuống dòng (\n)
          // Dấu + nghĩa là một hoặc nhiều ký tự phân cách liên tiếp.
          .split(/[\s,;\n]+/)
          .map((item) => item.trim().toUpperCase())
          .filter(Boolean),
      ),
    );
  }

  return [];
}

// Controller chỉ làm 3 việc:
// 1. Đọc và kiểm tra dữ liệu đầu vào từ HTTP request
// 2. Chuẩn hóa input để service không phải xử lý dữ liệu "bẩn"
// 3. Gọi service và trả response JSON cho FE
async function trigger(req, res) {
  try {
    const {
      semesterId,
      dryRun,
      limit,
      majorCodes,
      studentCodes,
      onlyStudentsWithoutEnrollments,
    } = req.body || {};
    if (!semesterId) {
      return res.status(400).json({
        success: false,
        message: 'semesterId is required',
      });
    }

    // Mọi tham số lọc / cờ boolean được chuẩn hóa ngay ở biên hệ thống.
    // Làm vậy để service tập trung vào business logic thay vì đoán client gửi kiểu dữ liệu gì.
    const result = await service.triggerAutoEnrollment(semesterId, {
      // Chỉ nhận đúng boolean true để tránh các giá trị truthy như "true" hay 1 bật nhầm dryRun.
      dryRun: dryRun === true,
      // limit chỉ được chấp nhận nếu parse ra số nguyên; sai định dạng sẽ coi như không giới hạn.
      limit: Number.isInteger(Number(limit)) ? Number(limit) : undefined,
      majorCodes: normalizeCodeList(majorCodes),
      studentCodes: normalizeCodeList(studentCodes),
      onlyStudentsWithoutEnrollments: onlyStudentsWithoutEnrollments === true,
    });

    // success=true ở đây nghĩa là request API đã được xử lý xong và service đã trả kết quả.
    // Kết quả chi tiết của từng sinh viên, số fail, số waitlist... nằm trong data.summary và data.logs.
    return res.status(200).json({
      success: true,
      message: dryRun === true ? 'Auto enrollment dry run completed' : 'Auto enrollment completed',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to trigger auto enrollment',
    });
  }
}

module.exports = {
  trigger,
};
