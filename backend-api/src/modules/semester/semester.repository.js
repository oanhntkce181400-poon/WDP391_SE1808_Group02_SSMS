const Semester = require("../../models/semester.model");

async function findAll(query = {}) {
  const { academicYear, isCurrent, semesterType, isActive, page = 1, limit = 10 } = query;
  const filter = {};
  if (academicYear) filter.academicYear = academicYear;
  if (isCurrent !== undefined) filter.isCurrent = isCurrent;
  if (semesterType) filter.semesterType = semesterType;
  if (isActive !== undefined) filter.isActive = isActive;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [data, total] = await Promise.all([
    Semester.find(filter)
      .sort({ academicYear: -1, semesterNum: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Semester.countDocuments(filter)
  ]);

  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  };
}

async function findById(id) {
  return Semester.findById(id).lean();
}

async function findByCode(code) {
  return Semester.findOne({ code }).lean();
}

async function clearCurrentFlag(excludeId = null, options = {}) {
  const filter = { isCurrent: true };
  if (excludeId) filter._id = { $ne: excludeId };
  return Semester.updateMany(filter, { isCurrent: false }, options);
}

async function create(data, options = {}) {
  if (options.session) {
    const [created] = await Semester.create([data], { session: options.session });
    return created;
  }

  return Semester.create(data);
}

async function updateById(id, data, options = {}) {
  return Semester.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
    ...(options.session ? { session: options.session } : {}),
  });
}

async function deleteById(id, options = {}) {
  return Semester.findByIdAndDelete(id, options.session ? { session: options.session } : {});
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
