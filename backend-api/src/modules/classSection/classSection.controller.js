const service = require("./classSection.service");

function handleError(res, err) {
  const msg = String(err?.message || "");
  if (msg.includes("Unauthorized") || msg.includes("không được phép") || msg.includes("chỉ có thể xem"))
    return res.status(403).json({ success: false, message: msg });
  if (msg.includes("conflict") || msg.includes("đang được sử dụng"))
    return res.status(409).json({ success: false, message: msg });
  if (msg.includes("not found"))
    return res.status(404).json({ success: false, message: msg });
  if (
    msg.includes("required") ||
    msg.includes("already exists") ||
    msg.includes("capacity") ||
    msg.includes("Cannot delete")
  )
    return res.status(400).json({ success: false, message: msg });
  console.error("[classSection.controller]", err);
  return res
    .status(500)
    .json({ success: false, message: msg || "Internal server error" });
}

async function getAll(req, res) {
  try {
    const result = await service.listClasses(req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getById(req, res) {
  try {
    const data = await service.getClassById(req.params.classId);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function create(req, res) {
  try {
    const data = await service.createClassSection(req.body || {});
    return res
      .status(201)
      .json({
        success: true,
        message: "Class section created successfully",
        data,
      });
  } catch (err) {
    return handleError(res, err);
  }
}

async function update(req, res) {
  try {
    const data = await service.updateClassSection(
      req.params.classId,
      req.body || {},
    );
    return res.json({
      success: true,
      message: "Class section updated successfully",
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function assignLecturer(req, res) {
  try {
    const classId = req.params.classId || req.params.id;
    const lecturerId = req.body?.lecturerId || req.body?.teacherId;

    if (!lecturerId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu lecturerId",
      });
    }

    const data = await service.assignLecturerToClass(classId, lecturerId);
    return res.json({
      success: true,
      message: "Phân công giảng viên thành công",
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function remove(req, res) {
  try {
    await service.deleteClassSection(req.params.classId);
    return res.json({
      success: true,
      message: "Class section deleted successfully",
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function enrollStudent(req, res) {
  try {
    const { classId, studentId } = req.body;
    const data = await service.enrollStudent(classId, studentId);
    return res
      .status(201)
      .json({ success: true, message: "Student enrolled successfully", data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getStudentEnrollments(req, res) {
  try {
    const { studentId } = req.params;
    const data = await service.getStudentEnrollments(
      studentId,
      req.query.status,
    );
    return res.json({ success: true, data, total: data.length });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getClassEnrollments(req, res) {
  try {
    const { classId } = req.params;
    const data = await service.getClassEnrollments(classId, req.query.status);
    return res.json({ success: true, data, total: data.length });
  } catch (err) {
    return handleError(res, err);
  }
}

async function dropCourse(req, res) {
  try {
    const data = await service.dropCourse(req.params.enrollmentId);
    return res.json({
      success: true,
      message: "Course dropped successfully",
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function checkConflict(req, res) {
  try {
    const { teacherId, roomId, timeslotId, dayOfWeek, semester, academicYear, excludeClassId } = req.body;

    // Validate required fields
    if (!teacherId || !roomId || !timeslotId || !dayOfWeek || !semester || !academicYear) {
      return res.status(400).json({
        success: false,
        message: "Thieu thong tin bat buoc de kiem tra trung lich"
      });
    }

    const conflicts = await service.checkScheduleConflict({
      teacherId,
      roomId,
      timeslotId,
      dayOfWeek: parseInt(dayOfWeek, 10),
      semester: parseInt(semester, 10),
      academicYear,
      excludeClassId
    });

    return res.json({
      success: true,
      hasConflict: conflicts.length > 0,
      conflicts
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function bulkUpdateStatus(req, res) {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sach ID lop hoc khong hop le",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Trang thai moi khong duoc de trong"
      });
    }

    const result = await service.bulkUpdateStatus(ids, status);

    return res.json({
      success: true,
      message: `Cập nhật thành công ${result.success.length}/${ids.length} lớp`,
      data: result
    });
  } catch (err) {
    return handleError(res, err);
  }
}
async function reassignClass(req, res) {
  try {
    const { fromClassId, toClassId, studentIds, closeSourceClass } = req.body;

    if (!fromClassId || !toClassId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin lớp nguồn hoặc lớp đích"
      });
    }

    if (fromClassId === toClassId) {
      return res.status(400).json({
        success: false,
        message: "Lớp nguồn và lớp đích không được trùng nhau"
      });
    }

    const result = await service.reassignClass({
      fromClassId,
      toClassId,
      studentIds,
      closeSourceClass: closeSourceClass === true,
    });

    let message = `Đã chuyển ${result.movedCount} sinh viên thành công`;
    if (result.skippedCount > 0) {
      message += ` (${result.skippedCount} sinh vien da dang ky lop dich, bo qua)`;
    }

    return res.json({
      success: true,
      message,
      data: result
    });
  } catch (err) {
    return handleError(res, err);
  }
}
// ─── UC22 - Search Available Classes ────────────────────────────────

async function searchClasses(req, res) {
  try {
    const { subject_id, semester, keyword, page, limit, sortBy, sortOrder } = req.query;
    const result = await service.searchAvailableClasses({
      subject_id,
      semester,
      keyword,
      page,
      limit,
      sortBy,
      sortOrder,
    });
    return res.json({
      success: true,
      message: 'Classes retrieved successfully',
      ...result,
    });
  } catch (err) {
    return handleError(res, err);
  }
}
// ─── Get Class Details for Student ───────────────────────────────────

async function getClassDetails(req, res) {
  try {
    const { classId } = req.params;
    const userId = req.auth?.sub;
    const role = String(req.auth?.role || '').toLowerCase();

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (role === 'student') {
      const data = await service.getClassDetails(classId, userId);
      return res.json({ success: true, data });
    }

    // Admin/Staff/Lecturer: xem thông tin lớp thật từ DB, không dùng demo mode
    const data = await service.getClassById(classId);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getClassList(req, res) {
  try {
    const classes = await service.getClassListWithCapacity();
    return res.json({
      success: true,
      message: 'Class list retrieved successfully',
      data: classes,
      total: classes.length,
    });
  } catch (err) {
    return handleError(res, err);
  }
}
async function selfEnroll(req, res) {
  try {
    const userId = req.auth?.sub;
    const { classId } = req.params;
    const data = await service.selfEnroll(userId, classId);
    return res.status(201).json({ success: true, message: "Đăng ký lớp thành công", data });
  } catch (err) {
    return handleError(res, err);
  }
}

// Tạo nhiều lớp học phần từ curriculum
async function bulkCreate(req, res) {
  try {
    const { classes } = req.body; // Array of { subjectId, semester, academicYear, maxCapacity }
    const userId = req.auth?.sub;
    
    if (!classes || !Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({ success: false, message: "Danh sach mon hoc khong hop le" });
    }

    const results = await service.bulkCreateClassSections(classes, userId);
    
    return res.json({
      success: true,
      message: `Tạo thành công ${results.success.length} lớp, thất bại ${results.failed.length} lớp`,
      data: results
    });
  } catch (err) {
    return handleError(res, err);
  }
}

// ─── UC99 - View Class Roster ───────────────────────────────────
async function getClassRoster(req, res) {
  try {
    const { id } = req.params;
    const userId = req.auth?.sub || req.auth?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const data = await service.getClassRosterForStudent(id, userId);
    return res.json({
      success: true,
      message: "Class roster retrieved successfully",
      data,
    });
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("chỉ có thể xem")) {
      return res.status(403).json({ success: false, message: msg });
    }
    return handleError(res, err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  assignLecturer,
  remove,
  enrollStudent,
  selfEnroll,
  bulkCreate,
  getStudentEnrollments,
  getClassEnrollments,
  dropCourse,
  checkConflict,
  bulkUpdateStatus,
  reassignClass,
  searchClasses,
  getClassList,
  getClassDetails,
  getClassRoster,
};


