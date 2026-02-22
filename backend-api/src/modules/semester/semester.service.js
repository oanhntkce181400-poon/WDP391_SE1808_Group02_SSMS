const repo = require("./semester.repository");

function formatSemester(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    code: doc.code,
    name: doc.name,
    semesterNum: doc.semesterNum,
    academicYear: doc.academicYear,
    startDate: doc.startDate,
    endDate: doc.endDate,
    isCurrent: Boolean(doc.isCurrent),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function listSemesters(query = {}) {
  const { academicYear, isCurrent } = query;
  const filter = {};
  if (academicYear) filter.academicYear = academicYear;
  if (isCurrent !== undefined)
    filter.isCurrent = isCurrent === "true" || isCurrent === true;

  const docs = await repo.findAll(filter);
  return docs.map(formatSemester);
}

async function getSemesterById(id) {
  const doc = await repo.findById(id);
  if (!doc) throw new Error("Semester not found");
  return formatSemester(doc);
}

async function createSemester(data) {
  const {
    code,
    name,
    semesterNum,
    academicYear,
    startDate,
    endDate,
    isCurrent,
  } = data;

  if (!code || !name || !semesterNum || !academicYear) {
    throw new Error("code, name, semesterNum and academicYear are required");
  }

  const existing = await repo.findByCode(code);
  if (existing) throw new Error("Semester code already exists");

  if (isCurrent) await repo.clearCurrentFlag();

  const doc = await repo.create({
    code,
    name,
    semesterNum,
    academicYear,
    startDate,
    endDate,
    isCurrent: !!isCurrent,
  });
  return formatSemester(doc);
}

async function updateSemester(id, data) {
  const { isCurrent, ...rest } = data;

  if (isCurrent) await repo.clearCurrentFlag(id);

  const update = { ...rest, ...(isCurrent !== undefined ? { isCurrent } : {}) };
  const updated = await repo.updateById(id, update);
  if (!updated) throw new Error("Semester not found");
  return formatSemester(updated.toObject ? updated.toObject() : updated);
}

async function deleteSemester(id) {
  const deleted = await repo.deleteById(id);
  if (!deleted) throw new Error("Semester not found");
  return { id };
}

module.exports = {
  listSemesters,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
};
