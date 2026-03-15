// Curriculum Service - Database operations for Curriculum
const Curriculum = require('../models/curriculum.model');

/**
 * Parse academicYear string to { startYear, endYear }.
 * Supports: "2026-2034", "2026/2034", "2024/2025"
 */
function parseAcademicYearRange(academicYear) {
  if (!academicYear || typeof academicYear !== 'string') return null;
  const parts = academicYear.trim().split(/[-/]/).map(p => parseInt(p, 10)).filter(n => !isNaN(n));
  if (parts.length < 2) return null;
  return { startYear: parts[0], endYear: parts[1] };
}

/**
 * Tìm khung chương trình áp dụng cho sinh viên theo chuyên ngành và năm nhập học.
 * Sinh viên nhập học năm 2026 sẽ thuộc curriculum có academicYear "2026-2034" (nếu major khớp).
 * @param {Object} student - { majorCode, enrollmentYear? (số), cohort? (số 2 chữ số) }
 * @returns {Object|null} Curriculum document hoặc null
 */
async function getCurriculumForStudent(student) {
  const majorCode = (student.majorCode || '').trim();
  const enrollmentYear = student.enrollmentYear != null
    ? Number(student.enrollmentYear)
    : (student.cohort != null ? 2000 + Number(student.cohort) : null);
  if (!majorCode || !enrollmentYear) return null;

  const Major = require('../models/major.model');
  const major = await Major.findOne({ majorCode, isActive: true }).lean();
  // curriculum.major có thể lưu mã (SE) hoặc tên (Kỹ thuật phần mềm)
  const majorNames = major ? [major.majorName, majorCode] : [majorCode];

  const curriculums = await Curriculum.find({
    status: 'active',
    $or: majorNames.map(m => ({ major: new RegExp(`^${String(m).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }))
  }).lean();

  for (const c of curriculums) {
    const range = parseAcademicYearRange(c.academicYear);
    if (!range) continue;
    if (enrollmentYear >= range.startYear && enrollmentYear <= range.endYear) {
      return c;
    }
  }
  return null;
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

