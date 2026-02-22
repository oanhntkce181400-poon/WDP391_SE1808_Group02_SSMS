const service = require("./lecturer.service");

function handleError(res, err) {
  const msg = String(err?.message || "");
  if (msg.includes("not found"))
    return res.status(404).json({ success: false, message: msg });
  if (
    msg.includes("required:") ||
    msg.includes("already exists") ||
    msg.includes("already registered")
  )
    return res
      .status(400)
      .json({ success: false, message: msg.replace("required: ", "") });
  console.error("[lecturer.controller]", err);
  return res
    .status(500)
    .json({ success: false, message: msg || "Internal server error" });
}

async function getAll(req, res) {
  try {
    const result = await service.listLecturers(req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getById(req, res) {
  try {
    const data = await service.getLecturerById(req.params.id);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function create(req, res) {
  try {
    const data = await service.createLecturer(
      req.body || {},
      req.file,
      req.auth,
    );
    return res.status(201).json({
      success: true,
      message: data._defaultPasswordHint || "Lecturer created successfully",
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function update(req, res) {
  try {
    const data = await service.updateLecturer(
      req.params.id,
      req.body || {},
      req.file,
    );
    return res.json({
      success: true,
      message: "Lecturer updated successfully",
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function remove(req, res) {
  try {
    const result = await service.deleteLecturer(req.params.id);
    return res.json({ success: true, message: result.message });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { getAll, getById, create, update, remove };
