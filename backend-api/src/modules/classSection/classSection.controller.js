const service = require("./classSection.service");

function handleError(res, err) {
  const msg = String(err?.message || "");
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
        message: "Thiếu thông tin bắt buộc để kiểm tra trùng lịch"
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
        message: "Danh sách ID lớp học không hợp lệ"
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái mới không được để trống"
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
      message += ` (${result.skippedCount} sinh viên đã đăng ký lớp đích, bỏ qua)`;
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

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  enrollStudent,
  selfEnroll: async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?._id;
      const { classId } = req.params;
      const data = await service.selfEnroll(userId, classId);
      return res.status(201).json({ success: true, message: "Đăng ký lớp thành công", data });
    } catch (err) {
      return handleError(res, err);
    }
  },
  getStudentEnrollments,
  getClassEnrollments,
  dropCourse,
  checkConflict,
  bulkUpdateStatus,
  reassignClass,
};
