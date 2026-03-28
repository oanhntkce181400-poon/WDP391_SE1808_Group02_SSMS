// Curriculum Service - Database operations for Curriculum
const Curriculum = require('../models/curriculum.model');
const Subject = require('../models/subject.model');
const Major = require('../models/major.model');

/**
 * Build a lookup map: majorId (string) → curricula.
 * Uses majorId ObjectId for exact match — avoids mismatches between
 * majorCode ("SE") vs major name ("Kỹ thuật Phần mềm").
 */
function buildCurriculumLookupByMajorId(curriculums = []) {
  const lookup = new Map();
  for (const c of curriculums) {
    const key = c.majorId ? String(c.majorId) : null;
    if (!key) continue;
    if (!lookup.has(key)) lookup.set(key, []);
    lookup.get(key).push(c);
  }
  return lookup;
}

/**
 * Get the majorId for a student by majorCode.
 * Caches in a map to avoid repeated DB queries in batch calls.
 */
async function getMajorIdByCode(majorCode, cache = null) {
  if (cache && cache.has(majorCode)) return cache.get(majorCode);
  const m = await Major.findOne({ majorCode }).lean();
  const id = m ? String(m._id) : null;
  if (cache) cache.set(majorCode, id);
  return id;
}

function normalizeText(value) {
  return String(value || '').trim().toUpperCase();
}

function toPlainObject(doc) {
  return doc?.toObject ? doc.toObject() : { ...doc };
}

/** Chuẩn hóa ngày từ API (YYYY-MM-DD hoặc ISO) — rỗng → null */
function normalizeSemesterDate(val) {
  if (val === undefined || val === null || val === '') return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getPopulatedSubject(course) {
  const subject = course?.subject;
  return subject && typeof subject === 'object' && subject._id ? subject : null;
}

function normalizeResolvedSubject(subject) {
  if (!subject?._id) return null;
  return {
    _id: subject._id,
    subjectCode: subject.subjectCode,
    subjectName: subject.subjectName,
    credits: subject.credits,
    tuitionFee: subject.tuitionFee,
  };
}

async function resolveRelationalCourseSubjects(courses = []) {
  const CurriculumCourse = require('../models/curriculumCourse.model');
  const plainCourses = courses.map(toPlainObject);
  const missingSubjectCodes = Array.from(
    new Set(
      plainCourses
        .filter((course) => !getPopulatedSubject(course))
        .map((course) => normalizeText(course.subjectCode))
        .filter(Boolean),
    ),
  );

  if (missingSubjectCodes.length === 0) {
    return plainCourses.map((course) => ({
      ...course,
      resolvedSubject: normalizeResolvedSubject(getPopulatedSubject(course)),
    }));
  }

  const fallbackSubjects = await Subject.find({
    subjectCode: { $in: missingSubjectCodes },
  })
    .select('_id subjectCode subjectName credits tuitionFee')
    .lean();

  const fallbackByCode = new Map(
    fallbackSubjects.map((subject) => [normalizeText(subject.subjectCode), normalizeResolvedSubject(subject)]),
  );

  const repairOps = plainCourses
    .map((course) => {
      const fallbackSubject = fallbackByCode.get(normalizeText(course.subjectCode));
      if (!fallbackSubject || !course._id) return null;

      return {
        updateOne: {
          filter: { _id: course._id },
          update: {
            $set: {
              subject: fallbackSubject._id,
              subjectCode: fallbackSubject.subjectCode,
              subjectName: fallbackSubject.subjectName,
              credits: course.credits ?? fallbackSubject.credits ?? 0,
            },
          },
        },
      };
    })
    .filter(Boolean);

  if (repairOps.length > 0) {
    try {
      await CurriculumCourse.bulkWrite(repairOps, { ordered: false });
    } catch (error) {
      // Best effort repair only. Consumers still get the fallback subject in-memory.
    }
  }

  return plainCourses.map((course) => ({
    ...course,
    resolvedSubject:
      normalizeResolvedSubject(getPopulatedSubject(course)) ||
      fallbackByCode.get(normalizeText(course.subjectCode)) ||
      null,
  }));
}

function mapRelationalCourseForClient(course) {
  const subject =
    course?.resolvedSubject || normalizeResolvedSubject(getPopulatedSubject(course));

  return {
    _id: subject?._id || null,
    code: course.subjectCode || subject?.subjectCode || course.code,
    name: course.subjectName || subject?.subjectName || course.name,
    credits: course.credits ?? subject?.credits ?? 0,
    hasPrerequisite: !!course.hasPrerequisite,
    subjectId: subject?._id || null,
    subject,
    tuitionFee: subject?.tuitionFee,
  };
}

/** Cấu trúc embedded (curriculum.semesters[].courses) → cùng shape với mapRelationalCourseForClient */
function mapEmbeddedCourseForClient(c) {
  if (!c) return null;
  return {
    _id: null,
    code: c.code,
    name: c.name,
    credits: Number(c.credits) || 0,
    hasPrerequisite: !!c.hasPrerequisite,
    subjectId: null,
    subject: null,
  };
}

/**
 * Parse academicYear string to { startYear, endYear }.
 * Supports: "2026-2034", "2026/2034", "2024/2025"
 */
function parseAcademicYearRange(academicYear) {
  if (!academicYear || typeof academicYear !== 'string') return null;
  const parts = academicYear
    .trim()
    .split(/[-/]/)
    .map((part) => parseInt(part, 10))
    .filter((part) => !Number.isNaN(part));
  if (parts.length < 2) return null;
  return { startYear: parts[0], endYear: parts[1] };
}

function resolveStudentEnrollmentYear(student = {}) {
  const enrollmentYear = Number.parseInt(student.enrollmentYear, 10);
  return Number.isNaN(enrollmentYear) ? null : enrollmentYear;
}

/** Kiểm tra năm nhập học có nằm trong khoảng academicYear của khung (vd "2026-2034") */
function curriculumCoversEnrollmentYear(curriculum, enrollmentYear) {
  if (!curriculum || enrollmentYear == null || Number.isNaN(Number(enrollmentYear))) return false;
  const range = parseAcademicYearRange(curriculum.academicYear);
  if (!range) return false;
  const y = Number(enrollmentYear);
  return y >= range.startYear && y <= range.endYear;
}

async function resolveMajorAliases(majorCode) {
  const normalizedMajorCode = normalizeText(majorCode);
  if (!normalizedMajorCode) return [];

  const Major = require('../models/major.model');
  const major = await Major.findOne({
    majorCode: normalizedMajorCode,
    isActive: true,
  }).lean();

  const aliases = new Set([normalizedMajorCode]);
  if (major?.majorName) {
    aliases.add(normalizeText(major.majorName));
  }

  return Array.from(aliases);
}

function buildCurriculumLookup(curriculums = []) {
  const lookup = new Map();

  for (const curriculum of curriculums) {
    // Ưu tiên majorId (ObjectId) — khớp chính xác, tránh mismtach tên ngành
    if (curriculum.majorId) {
      const key = String(curriculum.majorId);
      if (!lookup.has(key)) lookup.set(key, []);
      lookup.get(key).push(curriculum);
    }
    // Fallback: major name (legacy curricula không có majorId)
    const nameKey = normalizeText(curriculum?.major);
    if (nameKey && !lookup.has(nameKey)) {
      lookup.set(nameKey, []);
    }
    if (nameKey) {
      lookup.get(nameKey).push(curriculum);
    }
  }

  return lookup;
}

function sortCurriculumsByRange(curriculums = []) {
  return [...curriculums].sort((left, right) => {
    const leftRange = parseAcademicYearRange(left?.academicYear);
    const rightRange = parseAcademicYearRange(right?.academicYear);

    const leftStart = leftRange?.startYear || 0;
    const rightStart = rightRange?.startYear || 0;

    if (rightStart !== leftStart) {
      return rightStart - leftStart;
    }

    return String(right?._id || '').localeCompare(String(left?._id || ''));
  });
}

function curriculumMatchesAnyAlias(curriculum, aliases = []) {
  const normalizedMajor = normalizeText(curriculum?.major);
  return normalizedMajor && aliases.includes(normalizedMajor);
}

async function getCurriculumMatchForStudent(student, options = {}) {
  const majorCode = normalizeText(student?.majorCode);
  if (!majorCode) {
    return {
      curriculum: null,
      reason: 'missing_major_code',
      majorCode: null,
      enrollmentYear: resolveStudentEnrollmentYear(student),
      availableCurriculumCodes: [],
    };
  }

  const enrollmentYear = resolveStudentEnrollmentYear(student);

  // Resolve majorId for exact curriculum lookup
  // Ưu tiên: student.majorId (đã gán) > options cache > DB query
  let majorId = null;
  if (student?.majorId) {
    majorId = String(student.majorId);
  } else if (options.majorIdCache instanceof Map && options.majorIdCache.has(majorCode)) {
    majorId = options.majorIdCache.get(majorCode);
  } else {
    majorId = await getMajorIdByCode(majorCode, options.majorIdCache || null);
  }

  let matchingCurriculums = [];
  if (options.curriculumLookup instanceof Map) {
    // Prefer majorId lookup (exact, avoids name-vs-code mismatch)
    const deduped = new Map();
    if (majorId && options.curriculumLookup.get(majorId)) {
      for (const curriculum of options.curriculumLookup.get(majorId) || []) {
        deduped.set(String(curriculum._id), curriculum);
      }
    }
    // Fallback to aliases for legacy curricula without majorId
    let majorAliases = [];
    if (options.majorAliasesByCode instanceof Map && options.majorAliasesByCode.has(majorCode)) {
      majorAliases = options.majorAliasesByCode.get(majorCode);
    } else if (Array.isArray(options.majorAliases) && options.majorAliases.length > 0) {
      majorAliases = options.majorAliases;
    } else {
      majorAliases = await resolveMajorAliases(majorCode);
    }
    const normalizedAliases = Array.from(
      new Set([majorCode, ...majorAliases.map((a) => normalizeText(a)).filter(Boolean)]),
    );
    for (const alias of normalizedAliases) {
      for (const curriculum of options.curriculumLookup.get(alias) || []) {
        deduped.set(String(curriculum._id), curriculum);
      }
    }
    matchingCurriculums = Array.from(deduped.values());
  } else if (Array.isArray(options.curriculums)) {
    // majorId match first
    if (majorId) {
      matchingCurriculums = options.curriculums.filter((c) => String(c.majorId) === majorId);
    }
    if (!matchingCurriculums.length) {
      const majorAliases = await resolveMajorAliases(majorCode);
      const normalizedAliases = Array.from(
        new Set([majorCode, ...majorAliases.map((a) => normalizeText(a)).filter(Boolean)]),
      );
      matchingCurriculums = options.curriculums.filter((curriculum) =>
        curriculumMatchesAnyAlias(curriculum, normalizedAliases),
      );
    }
  } else {
    // Full DB query: match by majorId OR by name aliases
    if (majorId) {
      matchingCurriculums = await Curriculum.find({
        status: 'active',
        $or: [{ majorId: majorId }, { major: { $regex: majorCode, $options: 'i' } }],
      }).lean();
    } else {
      const majorAliases = await resolveMajorAliases(majorCode);
      const normalizedAliases = Array.from(
        new Set([majorCode, ...majorAliases.map((a) => normalizeText(a)).filter(Boolean)]),
      );
      matchingCurriculums = await Curriculum.find({ status: 'active' }).lean();
      matchingCurriculums = matchingCurriculums.filter((curriculum) =>
        curriculumMatchesAnyAlias(curriculum, normalizedAliases),
      );
    }
  }

  const availableCurriculumCodes = matchingCurriculums.map((c) => c.code).filter(Boolean);
  if (!matchingCurriculums.length) {
    return {
      curriculum: null,
      reason: 'no_active_curriculum_for_major',
      majorCode,
      enrollmentYear,
      availableCurriculumCodes,
    };
  }

  if (enrollmentYear == null) {
    if (options.allowSingleCurriculumFallback === true && matchingCurriculums.length === 1) {
      return {
        curriculum: matchingCurriculums[0],
        reason: 'fallback_single_curriculum',
        majorCode,
        enrollmentYear,
        availableCurriculumCodes,
        fallbackUsed: true,
      };
    }

    return {
      curriculum: null,
      reason: 'missing_enrollment_year',
      majorCode,
      enrollmentYear,
      availableCurriculumCodes,
    };
  }

  const matchedCurriculums = sortCurriculumsByRange(matchingCurriculums).filter((curriculum) => {
    const range = parseAcademicYearRange(curriculum.academicYear);
    if (!range) return false;
    return enrollmentYear >= range.startYear && enrollmentYear <= range.endYear;
  });

  if (!matchedCurriculums.length) {
    return {
      curriculum: null,
      reason: 'no_curriculum_for_enrollment_year',
      majorCode,
      enrollmentYear,
      availableCurriculumCodes,
    };
  }

  const exactIntakeMatch = matchedCurriculums.find((c) => {
    const range = parseAcademicYearRange(c.academicYear);
    return range && range.startYear === enrollmentYear;
  });
  const chosen = exactIntakeMatch || matchedCurriculums[0];

  return {
    curriculum: chosen,
    reason: 'matched',
    majorCode,
    enrollmentYear,
    availableCurriculumCodes,
  };
}

/**
 * Resolve the curriculum for a student based on major and enrollment year.
 */
async function getCurriculumForStudent(student, options = {}) {
  const match = await getCurriculumMatchForStudent(student, options);
  return match.curriculum;
}

const curriculumService = {
  // Get all curriculums with optional pagination
  async getCurriculums({
    page = 1,
    limit = 10,
    keyword = '',
    includeFrameworkStart = false,
  } = {}) {
    try {
      const query = keyword
        ? {
            $or: [
              { code: { $regex: keyword, $options: 'i' } },
              { name: { $regex: keyword, $options: 'i' } },
              { major: { $regex: keyword, $options: 'i' } },
            ],
          }
        : {};

      const total = await Curriculum.countDocuments(query);
      const q = Curriculum.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      let curriculums = includeFrameworkStart ? await q.lean() : await q;

      if (includeFrameworkStart && Array.isArray(curriculums) && curriculums.length > 0) {
        const CurriculumSemester = require('../models/curriculumSemester.model');
        const ids = curriculums.map((c) => c._id);
        const rows = await CurriculumSemester.aggregate([
          {
            $match: {
              curriculum: { $in: ids },
              startDate: { $exists: true, $ne: null },
            },
          },
          {
            $group: {
              _id: '$curriculum',
              frameworkStartAt: { $min: '$startDate' },
            },
          },
        ]);
        const byCur = new Map(
          rows.map((r) => [String(r._id), r.frameworkStartAt]),
        );
        for (const c of curriculums) {
          const dt = byCur.get(String(c._id));
          c.frameworkStartAt = dt || null;
          if (dt) {
            const y = new Date(dt).getFullYear();
            c.cohortFromFrameworkStart = Number.isFinite(y) ? y % 100 : null;
          } else {
            c.cohortFromFrameworkStart = null;
          }
        }
      }

      return {
        data: curriculums,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  },

  // Get single curriculum by ID
  async getCurriculumById(id) {
    try {
      const curriculum = await Curriculum.findById(id);
      if (!curriculum) {
        throw new Error('Curriculum not found');
      }
      
      // If using relational structure (or relational data already exists),
      // populate semesters with courses
      const CurriculumSemester = require('../models/curriculumSemester.model');
      const CurriculumCourse = require('../models/curriculumCourse.model');

      // Detect relational structure automatically: either flag is true
      // hoặc đã có bản ghi CurriculumSemester trong DB
      const relationalSemesters = await CurriculumSemester.find({ curriculum: id }).sort({ semesterOrder: 1 });
      const hasRelationalData = relationalSemesters.length > 0;

      if (curriculum.useRelationalStructure || hasRelationalData) {
        // Đảm bảo cờ luôn đúng cho các curriculum cũ
        if (!curriculum.useRelationalStructure && hasRelationalData) {
          curriculum.useRelationalStructure = true;
          await curriculum.save();
        }

        const semesters = relationalSemesters;

        // Get courses for each semester (CurriculumCourse uses subjectCode/subjectName)
        for (const sem of semesters) {
          const courses = await CurriculumCourse.find({ semester: sem._id })
            .populate('subject', 'subjectCode subjectName credits tuitionFee');
          const resolvedCourses = await resolveRelationalCourseSubjects(courses);
          sem.courses = resolvedCourses.map(mapRelationalCourseForClient);
          sem.id = sem.semesterOrder;
        }
        
        curriculum.semesters = semesters;
      }
      
      return curriculum;
    } catch (error) {
      throw error;
    }
  },

  // Create new curriculum
  async createCurriculum(data) {
    try {
      // Lọc bỏ các field không hợp lệ
      const { startYear, endYear, ...validData } = data;
      
      // Tính version tự động nếu không cung cấp
      if (!validData.version) {
        const maxVersion = await Curriculum.findOne({
          major: validData.major,
          academicYear: validData.academicYear
        }).sort({ version: -1 }).lean();
        
        validData.version = (maxVersion?.version || 0) + 1;
      }
      
      const curriculum = new Curriculum(validData);
      await curriculum.save();

      // Tự động khởi tạo sẵn các học kỳ cho khung chương trình mới (cấu trúc relational)
      const DEFAULT_SEMESTER_COUNT = 9;
      const CurriculumSemester = require('../models/curriculumSemester.model');

      const semestersToInsert = [];
      for (let i = 1; i <= DEFAULT_SEMESTER_COUNT; i++) {
        semestersToInsert.push({
          curriculum: curriculum._id,
          name: `Học kỳ ${i}`,
          semesterOrder: i,
          credits: 0,
        });
      }

      if (semestersToInsert.length > 0) {
        await CurriculumSemester.insertMany(semestersToInsert);
        // Đánh dấu curriculum đang sử dụng cấu trúc relational
        curriculum.useRelationalStructure = true;
        await curriculum.save();
      }

      return curriculum;
    } catch (error) {
      throw error;
    }
  },

  // Update existing curriculum
  async updateCurriculum(id, data) {
    try {
      const { semesters, startYear, endYear, ...restData } = data;
      
      // Chỉ lấy các field hợp lệ cho Curriculum model
      const validFields = ['code', 'name', 'major', 'majorId', 'academicYear', 'description', 'status', 'totalCredits', 'totalCourses'];
      const curriculumData = {};
      for (const key of validFields) {
        if (restData[key] !== undefined) {
          curriculumData[key] = restData[key];
        }
      }
      
      // Xử lý majorId - chỉ gửi nếu là ObjectId hợp lệ
      if (curriculumData.majorId === '' || curriculumData.majorId === null) {
        delete curriculumData.majorId;
      }
      
      const curriculum = await Curriculum.findById(id);
      
      if (!curriculum) {
        throw new Error('Curriculum not found');
      }
      
      // If using relational structure, handle semesters/courses separately
      // Chỉ xử lý semesters khi có gửi lên (tránh .map trên undefined)
      if (curriculum.useRelationalStructure && Array.isArray(semesters) && semesters.length > 0) {
        const CurriculumSemester = require('../models/curriculumSemester.model');
        const CurriculumCourse = require('../models/curriculumCourse.model');
        
        // Get existing semester IDs
        const existingSemesters = await CurriculumSemester.find({ curriculum: id });
        const existingSemesterIds = existingSemesters.map(s => s._id.toString());
        
        // Get semester IDs from data
        const newSemesterIds = semesters.map(s => s._id?.toString()).filter(Boolean);
        
        // Delete semesters that are not in the new data
        const toDelete = existingSemesterIds.filter(sid => !newSemesterIds.includes(sid));
        if (toDelete.length > 0) {
          await CurriculumCourse.deleteMany({ semester: { $in: toDelete } });
          await CurriculumSemester.deleteMany({ _id: { $in: toDelete } });
        }
        
        // Upsert semesters and courses
        for (const sem of semesters) {
          let semesterDoc;
          
          // Find existing semester by semesterOrder (sem.id) or _id
          const semId = sem.id || sem.semesterOrder;
          const existingSemester = await CurriculumSemester.findOne({ 
            curriculum: id,
            semesterOrder: semId
          });
          
          const startDate = normalizeSemesterDate(sem.startDate);
          const endDate = normalizeSemesterDate(sem.endDate);

          if (existingSemester) {
            // Update existing semester
            semesterDoc = await CurriculumSemester.findByIdAndUpdate(
              existingSemester._id,
              {
                name: sem.name,
                credits: sem.credits || 0,
                semesterOrder: semId,
                startDate,
                endDate,
              },
              { new: true }
            );
          } else {
            // Create new semester
            semesterDoc = new CurriculumSemester({
              curriculum: id,
              name: sem.name,
              semesterOrder: semId,
              credits: sem.credits || 0,
              startDate,
              endDate,
            });
            await semesterDoc.save();
          }
          
          // Update courses for this semester
          if (sem.courses && sem.courses.length > 0) {
            // Delete existing courses for this semester
            await CurriculumCourse.deleteMany({ semester: semesterDoc._id });
            
            const Subject = require('../models/subject.model');
            const subjectCodeList = sem.courses.map(c => (c.subjectCode || c.code || '').trim()).filter(Boolean);
            const subjectsByCode = {};
            if (subjectCodeList.length > 0) {
              const subjects = await Subject.find({ subjectCode: { $in: subjectCodeList } }).lean();
              subjects.forEach(s => { subjectsByCode[s.subjectCode] = s; });
            }
            
            const courseDocs = [];
            for (const c of sem.courses) {
              const code = (c.subjectCode || c.code || '').trim();
              const name = (c.subjectName || c.name || '').trim();
              const subjectDoc = subjectsByCode[code] || null;
              const subjectId = subjectDoc?._id || c.subjectId || null;
              if (!subjectId) continue;
              courseDocs.push({
                curriculum: id,
                semester: semesterDoc._id,
                subject: subjectId,
                subjectCode: code || subjectDoc?.subjectCode,
                subjectName: name || subjectDoc?.subjectName,
                credits: c.credits ?? subjectDoc?.credits ?? 0,
                hasPrerequisite: !!c.hasPrerequisite
              });
            }
            
            if (courseDocs.length > 0) {
              await CurriculumCourse.insertMany(courseDocs);
            }
          }
        }
        
        // Update curriculum metadata (not embedded semesters)
        await Curriculum.findByIdAndUpdate(id, {
          $set: {
            ...curriculumData,
            totalCredits: semesters.reduce((sum, s) => sum + (s.credits || 0), 0),
            totalCourses: semesters.reduce((sum, s) => sum + (s.courses?.length || 0), 0)
          }
        });
      } else {
        // Chỉ cập nhật các field cơ bản (không có semesters hoặc không dùng relational)
        if (Object.keys(curriculumData).length > 0) {
          await Curriculum.findByIdAndUpdate(id, { $set: curriculumData }, { new: true, runValidators: true });
        }
      }
      
      // Return full curriculum with populated semesters and courses so client can refresh view
      return await this.getCurriculumById(id);
    } catch (error) {
      throw error;
    }
  },

  // Delete curriculum
  async deleteCurriculum(id) {
    try {
      const curriculum = await Curriculum.findByIdAndDelete(id);
      if (!curriculum) {
        throw new Error('Curriculum not found');
      }
      return curriculum;
    } catch (error) {
      throw error;
    }
  },

  // Update curriculum semesters (courses in each semester)
  async updateCurriculumSemesters(id, semesters) {
    try {
      const curriculum = await Curriculum.findByIdAndUpdate(
        id,
        { $set: { semesters, updatedAt: new Date() } },
        { new: true, runValidators: true }
      );
      if (!curriculum) {
        throw new Error('Curriculum not found');
      }
      return curriculum;
    } catch (error) {
      throw error;
    }
  },

  // Get curriculum semesters (supports both embedded and relational structure)
  async getCurriculumSemesters(id) {
    try {
      const curriculum = await Curriculum.findById(id);
      if (!curriculum) {
        throw new Error('Curriculum not found');
      }
      // Check if using relational structure (or if relational data exists)
      const CurriculumSemester = require('../models/curriculumSemester.model');
      const CurriculumCourse = require('../models/curriculumCourse.model');
      const semestersDocs = await CurriculumSemester.find({ curriculum: id }).sort({ semesterOrder: 1 });
      const hasRelationalData = semestersDocs.length > 0;

      if (curriculum.useRelationalStructure || hasRelationalData) {
        const embeddedSemesters = curriculum.semesters || [];
        const result = [];

        // Attach courses for each semester so legacy consumers still receive full data
        for (const sem of semestersDocs) {
          const courses = await CurriculumCourse.find({ semester: sem._id })
            .populate('subject', 'subjectCode subjectName credits tuitionFee');
          const resolvedCourses = await resolveRelationalCourseSubjects(courses);

          let mapped = resolvedCourses.map(mapRelationalCourseForClient);

          // Nhiều CT vừa có CurriculumSemester (relational) vừa còn môn nằm trong embedded semesters[]
          // nhưng chưa migrate hết sang CurriculumCourse → fallback theo đúng semesterOrder / id
          if (!mapped.length) {
            const order = Number(sem.semesterOrder);
            const emb =
              embeddedSemesters.find((s) => Number(s.id) === order) ||
              embeddedSemesters.find((s) => Number(s.semesterOrder) === order);
            if (emb?.courses?.length) {
              mapped = emb.courses.map(mapEmbeddedCourseForClient).filter(Boolean);
            }
          }

          // Mongoose strict schema: CurriculumSemester không khai báo field `courses` → toJSON bỏ qua
          // nếu gán trực tiếp lên document. Trả về plain object để API luôn có `courses`.
          const plain = typeof sem.toObject === 'function' ? sem.toObject() : { ...sem };
          plain.courses = mapped;
          plain.id = plain.semesterOrder;
          result.push(plain);
        }

        return result;
      }
      
      // Fallback to embedded structure
      return curriculum.semesters || [];
    } catch (error) {
      throw error;
    }
  },

  // Get subjects by semester from curriculum (supports both embedded and relational)
  async getSubjectsBySemester(id, semester) {
    try {
      const curriculum = await Curriculum.findById(id);
      
      if (!curriculum) {
        return [];
      }
      
      // If using relational structure (or relational data exists)
      const CurriculumSemester = require('../models/curriculumSemester.model');
      const CurriculumCourse = require('../models/curriculumCourse.model');
      const semesterNum = parseInt(semester, 10);
      const semesterDoc = await CurriculumSemester.findOne({
        curriculum: id,
        semesterOrder: semesterNum
      });

      if (curriculum.useRelationalStructure || semesterDoc) {
        if (!semesterDoc) {
          return [];
        }

        // Get courses for this semester
        const courses = await CurriculumCourse.find({ semester: semesterDoc._id })
          .populate('subject', 'subjectCode subjectName credits tuitionFee');
        const resolvedCourses = await resolveRelationalCourseSubjects(courses);

        return resolvedCourses.map((course) => ({
          subject: course.resolvedSubject,
          credits: course.credits ?? course.resolvedSubject?.credits ?? 0,
          isRequired: course.isRequired,
          notes: course.notes,
        }));
      } else {
        // Embedded structure - find semester by semester number
        const sem = curriculum.semesters?.find(s => s.id === semesterNum);
        
        if (!sem || !sem.courses) {
          return [];
        }
        
        // Get all subject codes from courses
        const subjectCodes = sem.courses.map(c => c.code).filter(Boolean);
        
        // Lookup actual subjects from Subject collection
        const Subject = require('../models/subject.model');
        const subjects = await Subject.find({ subjectCode: { $in: subjectCodes } });
        const subjectMap = {};
        subjects.forEach(s => { subjectMap[s.subjectCode] = s; });
        
        // Map courses to match the format with actual Subject _id
        return sem.courses.map(course => {
          const actualSubject = subjectMap[course.code];
          return {
            subject: actualSubject ? {
              _id: actualSubject._id,
              subjectCode: actualSubject.subjectCode,
              subjectName: actualSubject.subjectName,
              credits: actualSubject.credits
            } : {
              _id: course._id,
              subjectCode: course.code,
              subjectName: course.name,
              credits: course.credits
            },
            credits: course.credits,
            isRequired: course.isRequired,
            notes: course.notes
          };
        });
      }
    } catch (error) {
      throw error;
    }
  },

  // Parse "2026-2034" -> { startYear, endYear }
  parseAcademicYearRange,
  buildCurriculumLookup,
  buildCurriculumLookupByMajorId,
  getMajorIdByCode,
  resolveStudentEnrollmentYear,
  curriculumCoversEnrollmentYear,
  getCurriculumMatchForStudent,

  // Tìm khung chương trình cho sinh viên theo majorCode + năm nhập học (trong khoảng academicYear)
  getCurriculumForStudent,

  /**
   * Chọn khung hiển thị/nghiệp vụ: curriculumId chỉ dùng nếu còn khớp năm nhập học;
   * nếu không — resolve lại theo major + enrollmentYear (tránh SV 2026 bị kẹt khung 2025 cũ).
   */
  async resolveCurriculumForStudentRecord(student, options = {}) {
    const enrollmentYear = resolveStudentEnrollmentYear(student);
    let fromId = null;
    if (student?.curriculumId) {
      fromId = await Curriculum.findById(student.curriculumId).lean();
    }
    if (
      fromId &&
      enrollmentYear != null &&
      curriculumCoversEnrollmentYear(fromId, enrollmentYear)
    ) {
      return { curriculum: fromId, source: 'curriculumId' };
    }
    const resolved = await getCurriculumForStudent(student, options);
    if (resolved) {
      return { curriculum: resolved, source: 'resolved' };
    }
    if (fromId) {
      return { curriculum: fromId, source: 'curriculumId_stale' };
    }
    return { curriculum: null, source: 'none' };
  },

  /**
   * Lấy kỳ hiện tại của sinh viên trong khung chương trình
   * Sử dụng student.currentCurriculumSemester thay vì tính toán từ system semester
   *
   * @param {Object} student - student document (có curriculumId, currentCurriculumSemester)
   * @returns {Object} - { curriculumSemester: Number, semesterDoc, subjects: [], curriculum }
   */
  async getStudentCurrentCurriculumSemester(student) {
    if (!student) {
      return {
        curriculumSemester: 1,
        semesterDoc: null,
        subjects: [],
        curriculum: null,
        message: 'Thiếu thông tin sinh viên'
      };
    }

    const { curriculum } = await this.resolveCurriculumForStudentRecord(student);

    if (!curriculum) {
      return {
        curriculumSemester: student.currentCurriculumSemester || 1,
        semesterDoc: null,
        subjects: [],
        curriculum: null,
        message: 'Không tìm thấy khung chương trình cho sinh viên'
      };
    }

    // Lấy kỳ hiện tại từ student
    const curriculumSemesterOrder = student.currentCurriculumSemester || 1;

    // Lấy thông tin kỳ trong curriculum
    const CurriculumSemester = require('../models/curriculumSemester.model');
    const semesterDoc = await CurriculumSemester.findOne({
      curriculum: curriculum._id,
      semesterOrder: curriculumSemesterOrder
    });

    // Lấy danh sách môn học trong kỳ
    const subjects = await this.getSubjectsBySemester(curriculum._id, curriculumSemesterOrder);

    return {
      curriculumSemester: curriculumSemesterOrder,
      semesterDoc,
      subjects,
      curriculum,
      message: 'Tính toán thành công'
    };
  },

  /**
   * Cập nhật kỳ hiện tại của sinh viên trong khung chương trình
   * Dùng để staff chuyển sinh viên sang kỳ tiếp theo
   *
   * @param {string} studentId - ID của sinh viên
   * @param {number} newSemester - Kỳ mới (1-9)
   * @returns {Object} - Student document đã cập nhật
   */
  async updateStudentCurriculumSemester(studentId, newSemester) {
    const Student = require('../models/student.model');
    
    if (newSemester < 1 || newSemester > 9) {
      throw new Error('Kỳ phải nằm trong khoảng 1-9');
    }

    const student = await Student.findByIdAndUpdate(
      studentId,
      { 
        currentCurriculumSemester: newSemester,
        updatedBy: null // Có thể thêm user ID nếu cần
      },
      { new: true }
    );

    if (!student) {
      throw new Error('Không tìm thấy sinh viên');
    }

    return student;
  },

  /**
   * Lấy kỳ tiếp theo trong khung chương trình cho SV
   * Dựa trên student.currentCurriculumSemester
   *
   * @param {Object} student - student document (có currentCurriculumSemester)
   * @returns {Object} - { nextCurriculumSemester: Number }
   */
  async getNextCurriculumSemester(student) {
    if (!student) {
      return { nextCurriculumSemester: 1 };
    }

    const currentSemester = student.currentCurriculumSemester || 1;
    const nextSemester = currentSemester + 1;

    return { nextCurriculumSemester: Math.min(nextSemester, 9) };
  }
};

module.exports = curriculumService;

