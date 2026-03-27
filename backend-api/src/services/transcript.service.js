const PDFDocument = require('pdfkit');
const { pickPdfFonts } = require('../utils/pdfFonts');
const ClassEnrollment = require('../models/classEnrollment.model');
const Student = require('../models/student.model');
const Transcript = require('../models/transcript.model');

// Grade to Point conversion (Vietnamese grading scale: 10-point to 4-point)
const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0
};

// Convert numeric grade (0-10) to letter grade
const numericToLetter = (grade) => {
  if (grade >= 9.0) return 'A+';
  if (grade >= 8.5) return 'A';
  if (grade >= 8.0) return 'A-';
  if (grade >= 7.5) return 'B+';
  if (grade >= 7.0) return 'B';
  if (grade >= 6.5) return 'B-';
  if (grade >= 6.0) return 'C+';
  if (grade >= 5.5) return 'C';
  if (grade >= 5.0) return 'C-';
  if (grade >= 4.5) return 'D+';
  if (grade >= 4.0) return 'D';
  if (grade >= 3.5) return 'D-';
  return 'F';
};

class TranscriptService {
  
  /**
   * Lấy preview bảng điểm (không có PDF)
   */
  async getPreview(studentId, options = {}) {
    const { semesterFrom, semesterTo } = options;
    
    const student = await Student.findById(studentId).populate('majorId curriculumId');
    if (!student) {
      throw new Error('Không tìm thấy sinh viên');
    }

    const query = {
      student: studentId,
      grade: { $exists: true, $ne: null },
      isFinalized: true
    };

    const enrollments = await ClassEnrollment.find(query)
      .populate({
        path: 'classSection',
        populate: { path: 'subject' }
      })
      .sort({ 'classSection.semester': 1 });

    if (enrollments.length === 0) {
      return {
        studentInfo: {
          studentId: student._id,
          name: student.fullName,
          studentCode: student.studentCode,
          major: student.majorCode,
          majorName: student.majorId?.name,
          cohort: student.cohort,
          program: student.curriculumId?.name || 'Không xác định',
        },
        summary: {
          totalCredits: 0,
          cumulativeGPA: '0.00',
          semesters: 0,
        },
        semesters: {},
      };
    }

    // Group by semester
    const semesterData = this.groupBySemester(enrollments, semesterFrom, semesterTo);

    // Calculate cumulative GPA (thang 4): dùng gradePoint, không dùng nhầm field `grade`
    const allGrades = enrollments.flatMap((e) => {
      if (semesterFrom && e.classSection?.semester < semesterFrom) return [];
      if (semesterTo && e.classSection?.semester > semesterTo) return [];
      const credits = e.classSection?.subject?.credits || 0;
      const num = Number(e.grade);
      if (!Number.isFinite(num) || credits <= 0) return [];
      const gp = GRADE_POINTS[numericToLetter(num)] ?? 0;
      return [{ gradePoint: gp, credits }];
    });

    const cumulativeGPA = this.calculateGPA(allGrades);
    const totalCredits = allGrades.reduce((sum, g) => sum + g.credits, 0);

    return {
      studentInfo: {
        studentId: student._id,
        name: student.fullName,
        studentCode: student.studentCode,
        major: student.majorCode,
        majorName: student.majorId?.name,
        cohort: student.cohort,
        program: student.curriculumId?.name || 'Không xác định',
      },
      summary: {
        totalCredits,
        cumulativeGPA: Number.isFinite(cumulativeGPA) ? cumulativeGPA.toFixed(2) : '0.00',
        semesters: Object.keys(semesterData).length,
      },
      semesters: semesterData,
    };
  }

  /**
   * Generate PDF transcript
   */
  async generatePDF(studentId, options = {}) {
    const preview = await this.getPreview(studentId, options);
    
    return new Promise((resolve, reject) => {
      const FONT = pickPdfFonts();
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        layout: 'landscape',
        autoFirstPage: true,
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(16).font(FONT.bold).text('TRƯỜNG ĐẠI HỌC FPT', { align: 'center' });
      doc.fontSize(14).font(FONT.bold).text('BẢNG ĐIỂM SINH VIÊN', { align: 'center' });
      doc.moveDown();

      // Student Info Box
      doc.fontSize(11).font(FONT.regular);
      const infoY = doc.y;
      
      doc.text(`Họ và tên: ${preview.studentInfo.name}`, 50, infoY);
      doc.text(`Mã sinh viên: ${preview.studentInfo.studentCode}`, 350, infoY);
      
      doc.text(`Ngành: ${preview.studentInfo.major} - ${preview.studentInfo.majorName || ''}`, 50, infoY + 18);
      doc.text(`Khóa: K${preview.studentInfo.cohort}`, 350, infoY + 18);
      
      doc.text(`Chương trình: ${preview.studentInfo.program}`, 50, infoY + 36);
      doc.moveDown(2);

      // Table Header
      const tableTop = doc.y;
      const colWidths = [60, 200, 60, 50, 60, 70];
      const headers = ['Mã môn', 'Tên môn', 'Số tín chỉ', 'Điểm', 'Thang 4', 'Kết quả'];

      doc.font(FONT.bold).fontSize(10);
      let xPos = 50;
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'center' });
        xPos += colWidths[i];
      });

      // Draw line
      doc.moveTo(50, tableTop + 15).lineTo(810, tableTop + 15).stroke();

      // Table Rows
      doc.font(FONT.regular).fontSize(9);
      let yPos = tableTop + 20;

      Object.values(preview.semesters).forEach((semester) => {
        // Semester header
        doc.font(FONT.bold).fontSize(10);
        doc.text(`Học kỳ ${semester.semester}`, 50, yPos);
        const sg = Number(semester.semesterGPA);
        doc.text(`GPA: ${Number.isFinite(sg) ? sg.toFixed(2) : '0.00'}`, 700, yPos, { width: 80 });
        yPos += 18;

        // Courses
        doc.font(FONT.regular).fontSize(9);
        semester.courses.forEach((course) => {
          xPos = 50;
          const gNum = Number(course.grade);
          const letterGrade = numericToLetter(Number.isFinite(gNum) ? gNum : 0);
          const gradePoint = GRADE_POINTS[letterGrade] || 0;
          const row = [
            course.code,
            String(course.name || '').substring(0, 30),
            String(course.credits ?? ''),
            Number.isFinite(gNum) ? gNum.toFixed(1) : '—',
            gradePoint.toFixed(1),
            gradePoint >= 1.0 ? 'Đạt' : 'Không đạt',
          ];

          row.forEach((cell, i) => {
            doc.text(cell, xPos, yPos, { width: colWidths[i], align: i === 1 ? 'left' : 'center' });
            xPos += colWidths[i];
          });
          yPos += 16;
        });

        // Semester subtotal
        doc.font(FONT.bold).fontSize(9);
        doc.text(`Tổng tín chỉ HK${semester.semester}: ${semester.totalCredits}`, 50, yPos);
        yPos += 20;

        // New page if needed
        if (yPos > 500) {
          doc.addPage();
          yPos = 50;
        }
      });

      // Summary
      doc.font(FONT.bold).fontSize(12);
      doc.moveDown(2);
      doc.text(`Tổng số tín chỉ tích lũy: ${preview.summary.totalCredits}`, 50);
      doc.text(`GPA tích lũy: ${preview.summary.cumulativeGPA}`, 50);

      // Footer
      doc.fontSize(9).font(FONT.oblique);
      const now = new Date();
      doc.text(`Ngày in: ${now.toLocaleDateString('vi-VN')}`, 700, 550, { align: 'right' });
      doc.text(`Trang 1/1`, 50, 550);

      doc.end();
    });
  }

  /**
   * Lưu log transcript request
   */
  async logTranscriptRequest(studentId, userId, options = {}) {
    const preview = await this.getPreview(studentId, options);
    
    const transcript = new Transcript({
      student: studentId,
      generatedBy: userId,
      semesterRange: options,
      status: 'generated',
      metadata: {
        totalCredits: preview.summary.totalCredits,
        cumulativeGPA: preview.summary.cumulativeGPA,
        semestersIncluded: Object.keys(preview.semesters).map(Number)
      }
    });
    
    await transcript.save();
    return transcript;
  }

  // Helper methods
  groupBySemester(enrollments, from, to) {
    const grouped = {};
    
    enrollments.forEach(enrollment => {
      const semesterNum = enrollment.classSection?.semester || 1;
      
      // Apply filters
      if (from && semesterNum < from) return;
      if (to && semesterNum > to) return;
      
      if (!grouped[semesterNum]) {
        grouped[semesterNum] = {
          semester: semesterNum,
          courses: [],
          semesterGPA: 0
        };
      }
      
      const course = enrollment.classSection?.subject || {};
      const numGrade = Number(enrollment.grade);
      grouped[semesterNum].courses.push({
        code: course.subjectCode || course.code || '',
        name: course.subjectName || course.name || '',
        credits: course.credits || 0,
        grade: Number.isFinite(numGrade) ? numGrade : null,
        gradePoint: GRADE_POINTS[numericToLetter(numGrade)] || 0,
      });
    });

    // Calculate GPA for each semester (calculateGPA expects { gradePoint, credits })
    Object.values(grouped).forEach((sem) => {
      sem.semesterGPA = this.calculateGPA(
        sem.courses.map((c) => ({ gradePoint: c.gradePoint, credits: c.credits })),
      );
      sem.totalCredits = sem.courses.reduce((sum, c) => sum + c.credits, 0);
    });

    return grouped;
  }

  calculateGPA(grades) {
    if (!Array.isArray(grades) || grades.length === 0) return 0;
    const totalPoints = grades.reduce((sum, g) => {
      const gp = Number(g.gradePoint);
      const cr = Number(g.credits) || 0;
      if (!Number.isFinite(gp) || cr <= 0) return sum;
      return sum + gp * cr;
    }, 0);
    const totalCredits = grades.reduce((sum, g) => sum + (Number(g.credits) || 0), 0);
    return totalCredits > 0 ? totalPoints / totalCredits : 0;
  }
}

module.exports = new TranscriptService();
