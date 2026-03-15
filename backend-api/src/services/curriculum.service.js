// Curriculum Service - Database operations for Curriculum
const Curriculum = require('../models/curriculum.model');
require('../models/subject.model');

function normalizeText(value) {
  return String(value || '').trim().toUpperCase();
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
    const key = normalizeText(curriculum?.major);
    if (!key) continue;

    if (!lookup.has(key)) {
      lookup.set(key, []);
    }

    lookup.get(key).push(curriculum);
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
  let majorAliases = [];

  if (options.majorAliasesByCode instanceof Map && options.majorAliasesByCode.has(majorCode)) {
    majorAliases = options.majorAliasesByCode.get(majorCode);
  } else if (Array.isArray(options.majorAliases) && options.majorAliases.length > 0) {
    majorAliases = options.majorAliases;
  } else {
    majorAliases = await resolveMajorAliases(majorCode);
  }

  const normalizedAliases = Array.from(
    new Set([majorCode, ...majorAliases.map((alias) => normalizeText(alias)).filter(Boolean)]),
  );

  let matchingCurriculums = [];
  if (options.curriculumLookup instanceof Map) {
    const deduped = new Map();
    for (const alias of normalizedAliases) {
      for (const curriculum of options.curriculumLookup.get(alias) || []) {
        deduped.set(String(curriculum._id), curriculum);
      }
    }
    matchingCurriculums = Array.from(deduped.values());
  } else if (Array.isArray(options.curriculums)) {
    matchingCurriculums = options.curriculums.filter((curriculum) =>
      curriculumMatchesAnyAlias(curriculum, normalizedAliases),
    );
  } else {
    const allActiveCurriculums = await Curriculum.find({ status: 'active' }).lean();
    matchingCurriculums = allActiveCurriculums.filter((curriculum) =>
      curriculumMatchesAnyAlias(curriculum, normalizedAliases),
    );
  }

  const availableCurriculumCodes = matchingCurriculums.map((curriculum) => curriculum.code).filter(Boolean);
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

  return {
    curriculum: matchedCurriculums[0],
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
  async getCurriculums({ page = 1, limit = 10, keyword = '' } = {}) {
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
      const curriculums = await Curriculum.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

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
            .populate('subject', 'subjectCode subjectName credits');
          sem.courses = courses.map(c => ({
            _id: c.subject?._id || c._id,
            code: c.subjectCode || c.code,
            name: c.subjectName || c.name,
            credits: c.credits ?? c.subject?.credits ?? 0,
            hasPrerequisite: !!c.hasPrerequisite,
            subjectId: c.subject?._id,
            subject: c.subject ? {
              _id: c.subject._id,
              subjectCode: c.subject.subjectCode,
              subjectName: c.subject.subjectName
            } : null
          }));
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
          
          if (existingSemester) {
            // Update existing semester
            semesterDoc = await CurriculumSemester.findByIdAndUpdate(
              existingSemester._id,
              { name: sem.name, credits: sem.credits || 0, semesterOrder: semId },
              { new: true }
            );
          } else {
            // Create new semester
            semesterDoc = new CurriculumSemester({
              curriculum: id,
              name: sem.name,
              semesterOrder: semId,
              credits: sem.credits || 0
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
              const subjectId = c.subjectId || c._id || (subjectDoc && subjectDoc._id);
              if (!subjectId && !subjectDoc) continue;
              courseDocs.push({
                curriculum: id,
                semester: semesterDoc._id,
                subject: subjectId || subjectDoc._id,
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
        const semesters = semestersDocs;

        // Attach courses for each semester so legacy consumers still receive full data
        for (const sem of semesters) {
          const courses = await CurriculumCourse.find({ semester: sem._id })
            .populate('subject', 'subjectCode subjectName credits');

          sem.courses = courses.map(c => ({
            _id: c.subject?._id || c._id,
            code: c.subjectCode || c.code,
            name: c.subjectName || c.name,
            credits: c.credits ?? c.subject?.credits ?? 0,
            hasPrerequisite: !!c.hasPrerequisite,
            subjectId: c.subject?._id,
            subject: c.subject
              ? {
                  _id: c.subject._id,
                  subjectCode: c.subject.subjectCode,
                  subjectName: c.subject.subjectName,
                  credits: c.subject.credits,
                }
              : null,
          }));

          // Normalize id field for frontend compatibility
          sem.id = sem.semesterOrder;
        }

        return semesters;
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
          .populate('subject', 'subjectCode subjectName credits');
        
        return courses.map(course => ({
          subject: course.subject,
          credits: course.credits,
          isRequired: course.isRequired,
          notes: course.notes
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
  resolveStudentEnrollmentYear,
  getCurriculumMatchForStudent,

  // Tìm khung chương trình cho sinh viên theo majorCode + năm nhập học (trong khoảng academicYear)
  getCurriculumForStudent,

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

    // Ưu tiên sử dụng curriculumId nếu có, hoặc tìm theo majorCode + enrollmentYear
    let curriculum = null;
    
    if (student.curriculumId) {
      const Curriculum = require('../models/curriculum.model');
      curriculum = await Curriculum.findById(student.curriculumId).lean();
    }

    // Nếu không có curriculumId hoặc không tìm thấy, tìm theo majorCode + enrollmentYear
    if (!curriculum) {
      curriculum = await getCurriculumForStudent(student);
    }

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

