const service = require("./semester.service");

function handleError(res, err) {
  const msg = String(err?.message || "");
  if (msg.includes("not found"))
    return res.status(404).json({ success: false, message: msg });
  if (msg.includes("required") || msg.includes("already exists"))
    return res.status(400).json({ success: false, message: msg });
  console.error("[semester.controller]", err);
  return res
    .status(500)
    .json({ success: false, message: msg || "Internal server error" });
}

async function getAll(req, res) {
  try {
    const data = await service.listSemesters(req.query);
    return res.json({ success: true, data, total: data.length });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getById(req, res) {
  try {
    const data = await service.getSemesterById(req.params.id);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function create(req, res) {
  try {
    const data = await service.createSemester(req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function update(req, res) {
  try {
    const data = await service.updateSemester(req.params.id, req.body || {});
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function remove(req, res) {
  try {
    await service.deleteSemester(req.params.id);
    return res.json({ success: true, message: "Semester deleted" });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { getAll, getById, create, update, remove };
