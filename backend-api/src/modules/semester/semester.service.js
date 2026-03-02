const repo = require("./semester.repository");

function formatSemester(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    code: doc.code,
    name: doc.name,
    semesterType: doc.semesterType || 'regular',
    semesterNum: doc.semesterNum,
    academicYear: doc.academicYear,
    startDate: doc.startDate,
    endDate: doc.endDate,
    description: doc.description,
    isCurrent: Boolean(doc.isCurrent),
    isActive: doc.isActive !== false,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function listSemesters(query = {}) {
  const { academicYear, isCurrent, semesterType, isActive, page, limit } = query;
  const filter = {};
  if (academicYear) filter.academicYear = academicYear;
  if (isCurrent !== undefined)
    filter.isCurrent = isCurrent === "true" || isCurrent === true;
  if (semesterType) filter.semesterType = semesterType;
  if (isActive !== undefined)
    filter.isActive = isActive === "true" || isActive === true;

  const result = await repo.findAll({
    ...filter,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10
  });
  
  return {
    data: result.data.map(formatSemester),
    pagination: result.pagination
  };
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
    semesterType,
    semesterNum,
    academicYear,
    startDate,
    endDate,
    description,
    isCurrent,
    isActive,
  } = data;

  if (!code || !name || !semesterNum) {
    throw new Error("code, name, and semesterNum are required");
  }

  const existing = await repo.findByCode(code);
  if (existing) throw new Error("Semester code already exists");

  if (isCurrent) await repo.clearCurrentFlag();

  const doc = await repo.create({
    code,
    name,
    semesterType: semesterType || 'regular',
    semesterNum,
    academicYear,
    startDate,
    endDate,
    description,
    isCurrent: !!isCurrent,
    isActive: isActive !== false,
  });
  return formatSemester(doc);
}

async function updateSemester(id, data) {
  const { isCurrent, isActive, ...rest } = data;

  if (isCurrent) await repo.clearCurrentFlag(id);

  const update = { 
    ...rest, 
    ...(isCurrent !== undefined ? { isCurrent } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
  };
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
