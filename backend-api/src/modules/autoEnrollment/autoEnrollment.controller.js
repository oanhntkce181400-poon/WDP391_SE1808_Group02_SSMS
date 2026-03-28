const mongoose = require('mongoose');
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
      excludeStudentsAlreadyAssignedInSemester,
      mode,
      curriculumId,
      classGroup,
    } = req.body || {};
    if (!semesterId) {
      return res.status(400).json({
        success: false,
        message: 'semesterId is required',
      });
    }

    // Mọi tham số lọc / cờ boolean được chuẩn hóa ngay ở biên hệ thống.
    // Làm vậy để service tập trung vào business logic thay vì đoán client gửi kiểu dữ liệu gì.
    let normalizedCurriculumId;
    if (curriculumId != null && String(curriculumId).trim() !== '') {
      const cid = String(curriculumId).trim();
      if (!mongoose.Types.ObjectId.isValid(cid)) {
        return res.status(400).json({
          success: false,
          message: 'curriculumId không hợp lệ',
        });
      }
      normalizedCurriculumId = cid;
    }

    const result = await service.triggerAutoEnrollment(semesterId, {
      // Chỉ nhận đúng boolean true để tránh các giá trị truthy như "true" hay 1 bật nhầm dryRun.
      dryRun: dryRun === true,
      // limit chỉ được chấp nhận nếu parse ra số nguyên; sai định dạng sẽ coi như không giới hạn.
      limit: Number.isInteger(Number(limit)) ? Number(limit) : undefined,
      majorCodes: normalizeCodeList(majorCodes),
      studentCodes: normalizeCodeList(studentCodes),
      onlyStudentsWithoutEnrollments: onlyStudentsWithoutEnrollments === true,
      excludeStudentsAlreadyAssignedInSemester:
        excludeStudentsAlreadyAssignedInSemester === true,
      mode: mode === 'retake' ? 'retake' : 'normal',
      curriculumId: normalizedCurriculumId,
      // classGroup: giới hạn xếp lớp cho một nhóm cụ thể (VD: "SE1808-01")
      classGroup:
        classGroup != null && String(classGroup).trim() !== ''
          ? String(classGroup).trim()
          : undefined,
    });

    // success=true ở đây nghĩa là request API đã được xử lý xong và service đã trả kết quả.
    // Kết quả chi tiết của từng sinh viên, số fail, số waitlist... nằm trong data.summary và data.logs.
    return res.status(200).json({
      success: result?.success !== false,
      message:
        result?.message ||
        (dryRun === true
          ? 'Auto enrollment dry run completed'
          : 'Auto enrollment completed'),
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to trigger auto enrollment',
    });
  }
}

async function getEnrollmentStatus(req, res) {
  try {
    const {
      semesterNum,
      academicYear,
      classGroup,
      curriculumId,
      curriculumSemesterOrder,
      majorCodes,
    } = req.query;

    if (!semesterNum || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'semesterNum and academicYear are required query params',
      });
    }

    const data = await service.getEnrollmentStatus({
      semesterNum: Number(semesterNum),
      academicYear: String(academicYear),
      classGroup: classGroup || undefined,
      curriculumId: curriculumId || undefined,
      curriculumSemesterOrder: curriculumSemesterOrder ?? undefined,
      majorCodes: majorCodes || undefined,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get enrollment status',
    });
  }
}

async function deleteEnrollments(req, res) {
  try {
    const { semesterNum, academicYear, classGroup, studentId } = req.query;

    if (!semesterNum || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'semesterNum and academicYear are required',
      });
    }

    const result = await service.deleteEnrollments({
      semesterNum: Number(semesterNum),
      academicYear: String(academicYear),
      classGroup: classGroup || undefined,
      studentId: studentId || undefined,
    });

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} enrollment(s)`,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to delete enrollments',
    });
  }
}

async function deleteWaitlists(req, res) {
  try {
    const { semesterNum, academicYear, classGroup, studentId, subjectId } = req.query;

    if (!semesterNum || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'semesterNum and academicYear are required',
      });
    }

    const result = await service.deleteWaitlists({
      semesterNum: Number(semesterNum),
      academicYear: String(academicYear),
      classGroup: classGroup || undefined,
      studentId: studentId || undefined,
      subjectId: subjectId || undefined,
    });

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} waitlist record(s)`,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to delete waitlists',
    });
  }
}

async function promoteWaitlist(req, res) {
  try {
    const { waitlistId } = req.params;
    const { targetClassSectionId } = req.body || {};

    if (!waitlistId) {
      return res.status(400).json({
        success: false,
        message: 'waitlistId is required',
      });
    }

    const result = await service.promoteWaitlist(
      String(waitlistId),
      targetClassSectionId ? String(targetClassSectionId) : undefined,
    );

    return res.status(200).json({
      success: true,
      message: result.alreadyEnrolled
        ? 'Student was already enrolled in this class; waitlist updated.'
        : 'Waitlist promoted to enrolled successfully.',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to promote waitlist',
    });
  }
}

async function listEligibleStudents(req, res) {
  try {
    const {
      semesterId,
      limit,
      majorCodes,
      studentCodes,
      onlyStudentsWithoutEnrollments,
      excludeStudentsAlreadyAssignedInSemester,
      mode,
      curriculumId,
      classGroup,
      curriculumSemesterOrder,
    } = req.body || {};
    if (!semesterId) {
      return res.status(400).json({
        success: false,
        message: 'semesterId is required',
      });
    }

    let normalizedCurriculumId;
    if (curriculumId != null && String(curriculumId).trim() !== '') {
      const cid = String(curriculumId).trim();
      if (!mongoose.Types.ObjectId.isValid(cid)) {
        return res.status(400).json({
          success: false,
          message: 'curriculumId không hợp lệ',
        });
      }
      normalizedCurriculumId = cid;
    }

    const csOrderRaw = curriculumSemesterOrder;
    const parsedCsOrder =
      csOrderRaw != null && String(csOrderRaw).trim() !== ''
        ? Number.parseInt(String(csOrderRaw), 10)
        : NaN;

    const data = await service.listEligibleStudents(semesterId, {
      limit: Number.isInteger(Number(limit)) ? Number(limit) : undefined,
      majorCodes: normalizeCodeList(majorCodes),
      studentCodes: normalizeCodeList(studentCodes),
      onlyStudentsWithoutEnrollments: onlyStudentsWithoutEnrollments === true,
      excludeStudentsAlreadyAssignedInSemester:
        excludeStudentsAlreadyAssignedInSemester === true,
      mode: mode === 'retake' ? 'retake' : 'normal',
      curriculumId: normalizedCurriculumId,
      classGroup:
        classGroup != null && String(classGroup).trim() !== ''
          ? String(classGroup).trim()
          : undefined,
      curriculumSemesterOrder:
        Number.isInteger(parsedCsOrder) && parsedCsOrder >= 1
          ? parsedCsOrder
          : undefined,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to list eligible students',
    });
  }
}

async function assignToClass(req, res) {
  try {
    const {
      semesterId,
      classSectionId,
      classLookup,
      classCode,
      studentIds,
      dryRun,
      limit,
      majorCodes,
      studentCodes,
      onlyStudentsWithoutEnrollments,
      excludeStudentsAlreadyAssignedInSemester,
      mode,
      curriculumId,
      classGroup,
      note,
    } = req.body || {};

    if (!semesterId) {
      return res.status(400).json({
        success: false,
        message: 'semesterId is required',
      });
    }

    const lookupTrim =
      classLookup != null && String(classLookup).trim() !== ''
        ? String(classLookup).trim()
        : classCode != null && String(classCode).trim() !== ''
          ? String(classCode).trim()
          : '';
    const rawSectionId =
      classSectionId != null && String(classSectionId).trim() !== ''
        ? String(classSectionId).trim()
        : '';
    const hasValidSectionId =
      rawSectionId && mongoose.Types.ObjectId.isValid(rawSectionId);

    if (!hasValidSectionId && !lookupTrim) {
      return res.status(400).json({
        success: false,
        message:
          'Cần chọn lớp (classSectionId) hoặc nhập mã lớp / tên lớp (classLookup)',
      });
    }
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'studentIds must be a non-empty array',
      });
    }

    let normalizedCurriculumId;
    if (curriculumId != null && String(curriculumId).trim() !== '') {
      const cid = String(curriculumId).trim();
      if (!mongoose.Types.ObjectId.isValid(cid)) {
        return res.status(400).json({
          success: false,
          message: 'curriculumId không hợp lệ',
        });
      }
      normalizedCurriculumId = cid;
    }

    const data = await service.assignStudentsToClassSection(
      semesterId,
      hasValidSectionId ? rawSectionId : '',
      studentIds,
      {
        dryRun: dryRun === true,
        limit: Number.isInteger(Number(limit)) ? Number(limit) : undefined,
        majorCodes: normalizeCodeList(majorCodes),
        studentCodes: normalizeCodeList(studentCodes),
        onlyStudentsWithoutEnrollments: onlyStudentsWithoutEnrollments === true,
        excludeStudentsAlreadyAssignedInSemester:
          excludeStudentsAlreadyAssignedInSemester === true,
        mode: mode === 'retake' ? 'retake' : 'normal',
        curriculumId: normalizedCurriculumId,
        classGroup:
          classGroup != null && String(classGroup).trim() !== ''
            ? String(classGroup).trim()
            : undefined,
        note: note != null && String(note).trim() !== '' ? String(note).trim() : undefined,
        classLookup: lookupTrim || undefined,
      },
    );

    return res.status(200).json({
      success: true,
      message:
        data.dryRun === true
          ? 'Dry run — không ghi ClassEnrollment'
          : 'Đã gán sinh viên vào lớp',
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to assign students',
    });
  }
}

async function createClassAndAssign(req, res) {
  try {
    const {
      semesterId,
      studentIds,
      newSection,
      dryRun,
      limit,
      studentLimit,
      majorCodes,
      studentCodes,
      onlyStudentsWithoutEnrollments,
      excludeStudentsAlreadyAssignedInSemester,
      mode,
      curriculumId,
      classGroup,
      note,
      curriculumSemesterOrder,
    } = req.body || {};

    const capRaw = studentLimit ?? limit;
    const parsedNewCap =
      capRaw !== undefined && capRaw !== null && String(capRaw).trim() !== ''
        ? Number.parseInt(String(capRaw), 10)
        : NaN;
    const newClassMaxCapacity =
      Number.isInteger(parsedNewCap) && parsedNewCap > 0
        ? parsedNewCap
        : undefined;

    if (!semesterId) {
      return res.status(400).json({
        success: false,
        message: 'semesterId is required',
      });
    }
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'studentIds must be a non-empty array',
      });
    }

    const sectionPayload = { ...(newSection && typeof newSection === 'object' ? newSection : {}) };
    if (
      sectionPayload.curriculumSemesterOrder == null &&
      curriculumSemesterOrder != null &&
      String(curriculumSemesterOrder).trim() !== ''
    ) {
      sectionPayload.curriculumSemesterOrder = curriculumSemesterOrder;
    }

    let normalizedCurriculumId;
    if (curriculumId != null && String(curriculumId).trim() !== '') {
      const cid = String(curriculumId).trim();
      if (!mongoose.Types.ObjectId.isValid(cid)) {
        return res.status(400).json({
          success: false,
          message: 'curriculumId không hợp lệ',
        });
      }
      normalizedCurriculumId = cid;
    }

    const data = await service.createClassSectionAndAssignStudents(
      semesterId,
      studentIds,
      {
        dryRun: dryRun === true,
        limit: Number.isInteger(Number(limit)) ? Number(limit) : undefined,
        newClassMaxCapacity,
        majorCodes: normalizeCodeList(majorCodes),
        studentCodes: normalizeCodeList(studentCodes),
        onlyStudentsWithoutEnrollments: onlyStudentsWithoutEnrollments === true,
        excludeStudentsAlreadyAssignedInSemester:
          excludeStudentsAlreadyAssignedInSemester === true,
        mode: mode === 'retake' ? 'retake' : 'normal',
        curriculumId: normalizedCurriculumId,
        classGroup:
          classGroup != null && String(classGroup).trim() !== ''
            ? String(classGroup).trim()
            : undefined,
        note: note != null && String(note).trim() !== '' ? String(note).trim() : undefined,
      },
      sectionPayload,
    );

    return res.status(200).json({
      success: true,
      message:
        data.dryRun === true
          ? 'Dry run — chưa tạo lớp / chưa ghi ClassEnrollment'
          : 'Đã tạo lớp và gán sinh viên',
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create class and assign students',
    });
  }
}

module.exports = {
  trigger,
  listEligibleStudents,
  assignToClass,
  createClassAndAssign,
  getEnrollmentStatus,
  deleteEnrollments,
  deleteWaitlists,
  promoteWaitlist,
};
