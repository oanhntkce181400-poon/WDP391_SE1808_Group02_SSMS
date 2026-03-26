const ClassEnrollment = require('../models/classEnrollment.model');
const Student = require('../models/student.model');
const Attendance = require('../models/attendance.model');

class PerformanceReportService {
  
  /**
   * Lấy tổng quan hiệu suất
   */
  async getOverview(filters = {}) {
    const { semesterCode, majorCode, cohort } = filters;
    
    // GPA Distribution
    const gpaDistribution = await ClassEnrollment.aggregate([
      { $match: { isFinalized: true, grade: { $exists: true } } },
      {
        $lookup: {
          from: 'classsections',
          localField: 'classSection',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: '$classInfo' },
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      // Apply filters
      ...(majorCode ? [{ $match: { 'studentInfo.majorCode': majorCode } }] : []),
      ...(cohort ? [{ $match: { 'studentInfo.cohort': parseInt(cohort) } }] : []),
      {
        $group: {
          _id: '$student',
          avgGrade: { $avg: '$grade' }
        }
      },
      {
        $bucket: {
          groupBy: '$avgGrade',
          boundaries: [0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
          default: 'other',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    // Pass/Fail rate
    const passFailStats = await ClassEnrollment.aggregate([
      { $match: { isFinalized: true, grade: { $exists: true } } },
      {
        $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' }
      },
      { $unwind: '$studentInfo' },
      ...(majorCode ? [{ $match: { 'studentInfo.majorCode': majorCode } }] : []),
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          passed: { $sum: { $cond: [{ $gte: ['$grade', 1.0] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $lt: ['$grade', 1.0] }, 1, 0] } }
        }
      }
    ]);

    // Average by subject
    const avgBySubject = await ClassEnrollment.aggregate([
      { $match: { isFinalized: true, grade: { $exists: true } } },
      {
        $lookup: {
          from: 'classsections',
          localField: 'classSection',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: '$classInfo' },
      {
        $lookup: {
          from: 'subjects',
          localField: 'classInfo.subject',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      },
      { $unwind: '$subjectInfo' },
      {
        $group: {
          _id: '$subjectInfo.code',
          name: { $first: '$subjectInfo.name' },
          avgScore: { $avg: '$grade' },
          minScore: { $min: '$grade' },
          maxScore: { $max: '$grade' },
          totalStudents: { $sum: 1 }
        }
      },
      { $sort: { avgScore: -1 } }
    ]);

    return {
      gpaDistribution: this.formatGPADistribution(gpaDistribution),
      passRate: passFailStats[0] ? {
        passed: passFailStats[0].passed,
        failed: passFailStats[0].failed,
        rate: ((passFailStats[0].passed / passFailStats[0].total) * 100).toFixed(2)
      } : null,
      avgBySubject
    };
  }

  /**
   * GPA Distribution (Histogram)
   */
  async getGPADistribution(filters = {}) {
    const { majorCode, cohort } = filters;

    const pipeline = [
      { $match: { isFinalized: true, grade: { $exists: true } } },
      {
        $lookup: { from: 'classsections', localField: 'classSection', foreignField: '_id', as: 'classInfo' }
      },
      { $unwind: '$classInfo' },
      {
        $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' }
      },
      { $unwind: '$studentInfo' },
      {
        $group: {
          _id: '$student',
          avgGrade: { $avg: '$grade' }
        }
      },
      {
        $bucket: {
          groupBy: '$avgGrade',
          boundaries: [0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
          default: 'other',
          output: { count: { $sum: 1 } }
        }
      }
    ];

    if (majorCode || cohort) {
      pipeline.splice(6, 0, {
        $match: {
          ...(majorCode ? { 'studentInfo.majorCode': majorCode } : {}),
          ...(cohort ? { 'studentInfo.cohort': parseInt(cohort) } : {})
        }
      });
    }

    const result = await ClassEnrollment.aggregate(pipeline);
    return this.formatGPADistribution(result);
  }

  /**
   * Average GPA by semester (trend)
   */
  async getGPABySemester(filters = {}) {
    const { majorCode, cohort } = filters;

    const pipeline = [
      { $match: { isFinalized: true, grade: { $exists: true } } },
      {
        $lookup: { from: 'classsections', localField: 'classSection', foreignField: '_id', as: 'classInfo' }
      },
      { $unwind: '$classInfo' },
      {
        $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' }
      },
      { $unwind: '$studentInfo' },
      ...(majorCode ? [{ $match: { 'studentInfo.majorCode': majorCode } }] : []),
      ...(cohort ? [{ $match: { 'studentInfo.cohort': parseInt(cohort) } }] : []),
      {
        $group: {
          _id: '$classInfo.semester',
          avgGPA: { $avg: '$grade' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const result = await ClassEnrollment.aggregate(pipeline);
    
    return result.map(r => ({
      semester: r._id,
      avgGPA: r.avgGPA.toFixed(2),
      studentsCount: r.count
    }));
  }

  /**
   * Top performing students
   */
  async getTopStudents(filters = {}, limit = 10) {
    const { majorCode, cohort, semester } = filters;

    const pipeline = [
      { $match: { isFinalized: true, grade: { $exists: true } } },
      {
        $lookup: { from: 'classsections', localField: 'classSection', foreignField: '_id', as: 'classInfo' }
      },
      { $unwind: '$classInfo' },
      {
        $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' }
      },
      { $unwind: '$studentInfo' },
      ...(majorCode ? [{ $match: { 'studentInfo.majorCode': majorCode } }] : []),
      ...(cohort ? [{ $match: { 'studentInfo.cohort': parseInt(cohort) } }] : []),
      ...(semester ? [{ $match: { 'classInfo.semester': parseInt(semester) } }] : []),
      {
        $group: {
          _id: '$student',
          studentInfo: { $first: '$studentInfo' },
          avgGrade: { $avg: '$grade' },
          completedCourses: { $sum: 1 }
        }
      },
      { $sort: { avgGrade: -1 } },
      { $limit: parseInt(limit) }
    ];

    const result = await ClassEnrollment.aggregate(pipeline);

    return result.map((r, index) => ({
      rank: index + 1,
      studentId: r._id,
      studentCode: r.studentInfo.studentCode,
      fullName: r.studentInfo.fullName,
      majorCode: r.studentInfo.majorCode,
      cohort: r.studentInfo.cohort,
      avgGrade: r.avgGrade.toFixed(2),
      completedCourses: r.completedCourses
    }));
  }

  /**
   * Students at risk (GPA < 2.0)
   */
  async getAtRiskStudents(filters = {}, limit = 20) {
    const { majorCode, cohort } = filters;

    const pipeline = [
      { $match: { isFinalized: true, grade: { $exists: true } } },
      {
        $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' }
      },
      { $unwind: '$studentInfo' },
      ...(majorCode ? [{ $match: { 'studentInfo.majorCode': majorCode } }] : []),
      ...(cohort ? [{ $match: { 'studentInfo.cohort': parseInt(cohort) } }] : []),
      {
        $group: {
          _id: '$student',
          studentInfo: { $first: '$studentInfo' },
          avgGrade: { $avg: '$grade' },
          failedCourses: {
            $sum: { $cond: [{ $lt: ['$grade', 1.0] }, 1, 0] }
          }
        }
      },
      { $match: { avgGrade: { $lt: 2.0 } } },
      { $sort: { avgGrade: 1 } },
      { $limit: parseInt(limit) }
    ];

    const result = await ClassEnrollment.aggregate(pipeline);

    return result.map(r => ({
      studentId: r._id,
      studentCode: r.studentInfo.studentCode,
      fullName: r.studentInfo.fullName,
      majorCode: r.studentInfo.majorCode,
      cohort: r.studentInfo.cohort,
      avgGrade: r.avgGrade.toFixed(2),
      failedCourses: r.failedCourses
    }));
  }

  // Helper methods
  formatGPADistribution(distribution) {
    const labels = {
      '0': '0.0 - 1.5',
      '1.5': '1.5 - 2.0',
      '2.0': '2.0 - 2.5',
      '2.5': '2.5 - 3.0',
      '3.0': '3.0 - 3.5',
      '3.5': '3.5 - 4.0'
    };

    return distribution.map(d => ({
      range: labels[d._id] || d._id,
      count: d.count
    }));
  }
}

module.exports = new PerformanceReportService();
