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

async function getMyClasses(req, res) {
  try {
    const userId = req.auth?.sub;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const data = await service.getMyClasses(userId);
    return res.json({ success: true, data, total: data.length });
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
  getStudentEnrollments,
  getClassEnrollments,
  dropCourse,
  getMyClasses,
};
