// Curriculum Service - Database operations for Curriculum
const Curriculum = require('../models/curriculum.model');

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
      
      // If using relational structure, populate semesters with courses
      if (curriculum.useRelationalStructure) {
        const CurriculumSemester = require('../models/curriculumSemester.model');
        const CurriculumCourse = require('../models/curriculumCourse.model');
        
        const semesters = await CurriculumSemester.find({ curriculum: id }).sort({ semesterOrder: 1 });
        
        // Get courses for each semester
        for (const sem of semesters) {
          const courses = await CurriculumCourse.find({ semester: sem._id })
            .populate('subject', 'subjectCode subjectName credits');
          sem.courses = courses.map(c => ({
            _id: c._id,
            code: c.code,
            name: c.name,
            credits: c.credits,
            hasPrerequisite: c.hasPrerequisite,
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
      const curriculum = new Curriculum(data);
      await curriculum.save();
      return curriculum;
    } catch (error) {
      throw error;
    }
  },

  // Update existing curriculum
  async updateCurriculum(id, data) {
    try {
      const { semesters, ...curriculumData } = data;
      const curriculum = await Curriculum.findById(id);
      
      if (!curriculum) {
        throw new Error('Curriculum not found');
      }
      
      // If using relational structure, handle semesters/courses separately
      if (curriculum.useRelationalStructure && semesters) {
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
          
          if (sem._id) {
            // Update existing semester
            semesterDoc = await CurriculumSemester.findByIdAndUpdate(
              sem._id,
              { name: sem.name, credits: sem.credits || 0, semesterOrder: sem.id },
              { new: true, upsert: true, new: true }
            );
          } else {
            // Create new semester
            semesterDoc = new CurriculumSemester({
              curriculum: id,
              name: sem.name,
              semesterOrder: sem.id,
              credits: sem.credits || 0
            });
            await semesterDoc.save();
          }
          
          // Update courses for this semester
          if (sem.courses && sem.courses.length > 0) {
            // Delete existing courses for this semester
            await CurriculumCourse.deleteMany({ semester: semesterDoc._id });
            
            // Add new courses
            const courseDocs = sem.courses.map(c => ({
              curriculum: id,
              semester: semesterDoc._id,
              subject: c._id || c.subjectId, // Could be subject ID or embedded
              code: c.code,
              name: c.name,
              credits: c.credits,
              hasPrerequisite: c.hasPrerequisite || false
            }));
            
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
        // Traditional embedded structure
        await Curriculum.findByIdAndUpdate(
          id,
          { $set: data },
          { new: true, runValidators: true }
        );
      }
      
      return await Curriculum.findById(id);
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
      
      // Check if using relational structure
      if (curriculum.useRelationalStructure) {
        const CurriculumSemester = require('../models/curriculumSemester.model');
        const semesters = await CurriculumSemester.find({ curriculum: id }).sort({ semesterOrder: 1 });
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
      
      // If using relational structure
      if (curriculum.useRelationalStructure) {
        const CurriculumSemester = require('../models/curriculumSemester.model');
        const CurriculumCourse = require('../models/curriculumCourse.model');
        
        // Find semester by curriculum and semester number
        console.log("Searching for semester with semester:", semester, "type:", typeof semester);
        const semesterDoc = await CurriculumSemester.findOne({
          curriculum: id,
          semesterOrder: parseInt(semester, 10)
        });
        console.log("Found semesterDoc:", semesterDoc);
        
        if (!semesterDoc) {
          return [];
        }
        
        // Get courses for this semester
        const courses = await CurriculumCourse.find({ semester: semesterDoc._id })
          .populate('subject', 'subjectCode subjectName credits');
        
        console.log("Found courses:", courses);
        
        return courses.map(course => ({
          subject: course.subject,
          credits: course.credits,
          isRequired: course.isRequired,
          notes: course.notes
        }));
      } else {
        // Embedded structure - find semester by semester number
        const semesterNum = parseInt(semester, 10);
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
};

module.exports = curriculumService;

