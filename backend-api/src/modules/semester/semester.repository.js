const Semester = require("../../models/semester.model");

async function findAll({ academicYear, isCurrent } = {}) {
  const filter = {};
  if (academicYear) filter.academicYear = academicYear;
  if (isCurrent !== undefined) filter.isCurrent = isCurrent;
  return Semester.find(filter)
    .sort({ academicYear: -1, semesterNum: 1 })
    .lean();
}

async function findById(id) {
  return Semester.findById(id).lean();
}

async function findByCode(code) {
  return Semester.findOne({ code }).lean();
}

async function clearCurrentFlag(excludeId = null) {
  const filter = { isCurrent: true };
  if (excludeId) filter._id = { $ne: excludeId };
  return Semester.updateMany(filter, { isCurrent: false });
}

async function create(data) {
  return Semester.create(data);
}

async function updateById(id, data) {
  return Semester.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
}

async function deleteById(id) {
  return Semester.findByIdAndDelete(id);
}

module.exports = {
  findAll,
  findById,
  findByCode,
  clearCurrentFlag,
  create,
  updateById,
  deleteById,
};
