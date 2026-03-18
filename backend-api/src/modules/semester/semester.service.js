const repo = require("./semester.repository");
const autoEnrollmentService = require("../autoEnrollment/autoEnrollment.service");
const mongoose = require('mongoose');

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
}

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

function buildSemesterWritePayload(doc) {
  if (!doc) return {};
  return {
    code: doc.code,
    name: doc.name,
    semesterType: doc.semesterType || 'regular',
    semesterNum: doc.semesterNum,
    academicYear: doc.academicYear,
    startDate: doc.startDate || null,
    endDate: doc.endDate || null,
    description: doc.description || null,
    isCurrent: Boolean(doc.isCurrent),
    isActive: doc.isActive !== false,
  };
}

function buildAutoEnrollmentFailure(semesterDoc, autoEnrollment) {
  const summary = autoEnrollment?.summary || {};
  const summaryMessage = autoEnrollment?.summary
    ? ` (${summary.failed || 0} errors, ${summary.totalEnrollments || 0} enrollments, ${summary.waitlisted || 0} waitlists)`
    : '';

  const error = new Error(
    autoEnrollment?.message || `Auto enrollment failed for semester ${semesterDoc?.code || ''}${summaryMessage}`,
  );
  error.statusCode = 409;
  error.autoEnrollment = autoEnrollment;
  return error;
}

async function rollbackCurrentSemesterChange({
  targetSemesterId,
  previousSemesterSnapshot = null,
  previousCurrentSemesterId = null,
  deleteTarget = false,
}) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await repo.clearCurrentFlag(null, { session });

      if (deleteTarget) {
        await repo.deleteById(targetSemesterId, { session });
      } else if (previousSemesterSnapshot) {
        await repo.updateById(
          targetSemesterId,
          buildSemesterWritePayload(previousSemesterSnapshot),
          { session },
        );
      }

      if (
        previousCurrentSemesterId &&
        (!previousSemesterSnapshot ||
          String(previousCurrentSemesterId) !== String(previousSemesterSnapshot._id))
      ) {
        await repo.updateById(
          previousCurrentSemesterId,
          { isCurrent: true, isActive: true },
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }
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

  const normalizedIsCurrent = normalizeBoolean(isCurrent, false);
  const normalizedIsActive = normalizeBoolean(isActive, true);

  if (!code || !name || !semesterNum) {
    throw new Error("code, name, and semesterNum are required");
  }

  if (normalizedIsCurrent && !normalizedIsActive) {
    throw new Error("Current semester must remain active");
  }

  const existing = await repo.findByCode(code);
  if (existing) throw new Error("Semester code already exists");
  const previousCurrentSemester = normalizedIsCurrent ? await repo.findCurrent() : null;

  const session = await mongoose.startSession();
  let doc;

  try {
    await session.withTransaction(async () => {
      if (normalizedIsCurrent) {
        await repo.clearCurrentFlag(null, { session });
      }

      doc = await repo.create(
        {
          code,
          name,
          semesterType: semesterType || 'regular',
          semesterNum,
          academicYear,
          startDate,
          endDate,
          description,
          isCurrent: normalizedIsCurrent,
          isActive: normalizedIsActive,
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  const payload = formatSemester(doc);

  if (payload.isCurrent) {
    try {
      const autoEnrollment = await autoEnrollmentService.triggerAutoEnrollment(String(doc._id));
      if (autoEnrollment?.success === false) {
        throw buildAutoEnrollmentFailure(doc, autoEnrollment);
      }
      payload.autoEnrollment = autoEnrollment;
    } catch (error) {
      try {
        await rollbackCurrentSemesterChange({
          targetSemesterId: doc._id,
          previousCurrentSemesterId: previousCurrentSemester?._id || null,
          deleteTarget: true,
        });
      } catch (rollbackError) {
        error.message = `${error.message || "Failed to trigger auto enrollment"}. Rollback failed: ${rollbackError.message}`;
      }

      if (!String(error.message || '').includes('Rollback failed')) {
        error.message = `${error.message || "Failed to trigger auto enrollment"}. Semester creation was rolled back.`;
      }
      error.statusCode = error.statusCode || 409;
      throw error;
    }
  }

  return payload;
}

async function updateSemester(id, data) {
  const { isCurrent, isActive, ...rest } = data;
  const existingSemester = await repo.findById(id);
  if (!existingSemester) throw new Error("Semester not found");

  const willSetCurrent = normalizeBoolean(isCurrent, false);
  const nextIsCurrent = isCurrent !== undefined ? willSetCurrent : existingSemester.isCurrent === true;
  const nextIsActive = normalizeBoolean(isActive, existingSemester.isActive !== false);

  if (nextIsCurrent && !nextIsActive) {
    throw new Error("Current semester must remain active");
  }

  const previousCurrentSemester =
    isCurrent !== undefined && willSetCurrent && !existingSemester.isCurrent
      ? await repo.findCurrent()
      : null;

  const update = {
    ...rest, 
    ...(isCurrent !== undefined ? { isCurrent: willSetCurrent } : {}),
    ...(isActive !== undefined ? { isActive: nextIsActive } : {}),
  };

  const session = await mongoose.startSession();
  let updated;

  try {
    await session.withTransaction(async () => {
      if (isCurrent !== undefined && willSetCurrent) {
        await repo.clearCurrentFlag(id, { session });
      }

      updated = await repo.updateById(id, update, { session });
    });
  } finally {
    await session.endSession();
  }

  if (!updated) throw new Error("Semester not found");
  const payload = formatSemester(updated.toObject ? updated.toObject() : updated);

  if (isCurrent !== undefined && willSetCurrent && !existingSemester.isCurrent) {
    try {
      const autoEnrollment = await autoEnrollmentService.triggerAutoEnrollment(id);
      if (autoEnrollment?.success === false) {
        throw buildAutoEnrollmentFailure(updated, autoEnrollment);
      }
      payload.autoEnrollment = autoEnrollment;
    } catch (error) {
      try {
        await rollbackCurrentSemesterChange({
          targetSemesterId: id,
          previousSemesterSnapshot: existingSemester,
          previousCurrentSemesterId: previousCurrentSemester?._id || null,
        });
      } catch (rollbackError) {
        error.message = `${error.message || "Failed to trigger auto enrollment"}. Rollback failed: ${rollbackError.message}`;
      }

      if (!String(error.message || '').includes('Rollback failed')) {
        error.message = `${error.message || "Failed to trigger auto enrollment"}. Semester update was rolled back.`;
      }
      error.statusCode = error.statusCode || 409;
      throw error;
    }
  }

  return payload;
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
