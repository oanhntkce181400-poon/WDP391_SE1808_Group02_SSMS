// export.service.js
// Service xử lý xuất dữ liệu điểm dưới dạng Excel hoặc PDF
// Tác giả: Group02 - WDP391

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const ClassEnrollment = require('../models/classEnrollment.model');
const Student = require('../models/student.model');

class ExportService {
  /**
   * Lấy dữ liệu điểm cho export với các filter
   */
  async getExportData(studentId, filters = {}) {
    try {
      const query = {
        student: studentId,
        status: { $in: ['enrolled', 'completed', 'active'] }
      };

      // Get enrollments with populated data
      let enrollments = await ClassEnrollment.find(query)
        .populate({
          path: 'classSection',
          populate: [
            {
              path: 'subject',
              select: 'subjectCode subjectName credits gradingWeights'
            },
            {
              path: 'teacher',
              select: 'fullName email'
            }
          ]
        })
        .populate('student', 'studentCode fullName email')
        .sort({ createdAt: -1 })
        .lean();

      // Filter by semester (after population)
      if (filters.semester) {
        const semesterNum = parseInt(filters.semester);
        enrollments = enrollments.filter(e => 
          e.classSection && e.classSection.semester === semesterNum
        );
      }

      // Filter by academicYear (after population)
      if (filters.academicYear) {
        enrollments = enrollments.filter(e => 
          e.classSection && e.classSection.academicYear === filters.academicYear
        );
      }

      // Filter by classSection
      if (filters.classSection) {
        enrollments = enrollments.filter(e => 
          e.classSection && e.classSection._id.toString() === filters.classSection
        );
      }

      // Filter by major (if specified)
      if (filters.major) {
        const studentData = await Student.findOne({ userId: studentId }).lean();
        if (studentData && studentData.major !== filters.major) {
          return [];
        }
      }

      return enrollments;
    } catch (error) {
      console.error('Error in getExportData:', error);
      throw new Error(`Lỗi lấy dữ liệu export: ${error.message}`);
    }
  }

  /**
   * Tạo file Excel cho báo cáo điểm
   */
  async generateExcel(enrollments, studentInfo) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Báo cáo điểm');

      // Set column widths
      worksheet.columns = [
        { header: 'Kỳ học', key: 'semester', width: 15 },
        { header: 'Mã môn', key: 'subjectCode', width: 12 },
        { header: 'Tên môn', key: 'subjectName', width: 25 },
        { header: 'Tín chỉ', key: 'credits', width: 8 },
        { header: 'GK', key: 'midtermScore', width: 8 },
        { header: 'CK', key: 'finalScore', width: 8 },
        { header: 'BT', key: 'assignmentScore', width: 8 },
        { header: 'QT', key: 'continuousScore', width: 8 },
        { header: 'Điểm cuối', key: 'grade', width: 10 },
        { header: 'Xếp loại', key: 'gradeName', width: 12 },
        { header: 'Trạng thái', key: 'status', width: 12 }
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1d4ed8' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'center' };

      // Add header info
      let rowIndex = 3;
      worksheet.getCell(`A${rowIndex}`).value = `Sinh viên: ${studentInfo.fullName}`;
      worksheet.getCell(`A${rowIndex}`).font = { bold: true, size: 12 };
      rowIndex++;

      worksheet.getCell(`A${rowIndex}`).value = `Mã số: ${studentInfo.studentCode}`;
      worksheet.getCell(`A${rowIndex}`).font = { bold: true };
      rowIndex++;

      worksheet.getCell(`A${rowIndex}`).value = `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`;
      rowIndex++;

      // Add data rows
      rowIndex = 6;
      let prevSemester = null;

      for (const enrollment of enrollments) {
        if (!enrollment.classSection) continue;

        const currentSemester = `Kỳ ${enrollment.classSection.semester} - ${enrollment.classSection.academicYear}`;
        
        // Add semester separator
        if (prevSemester !== currentSemester) {
          if (prevSemester !== null) {
            rowIndex++;
          }
          worksheet.getCell(`A${rowIndex}`).value = currentSemester;
          worksheet.getCell(`A${rowIndex}`).font = { bold: true, color: { argb: 'FF1d4ed8' } };
          worksheet.getCell(`A${rowIndex}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFe0e7ff' }
          };
          worksheet.mergeCells(`A${rowIndex}:K${rowIndex}`);
          rowIndex++;
          prevSemester = currentSemester;
        }

        const grade = Number(enrollment.grade);
        let gradeName = 'N/A';
        if (!isNaN(grade)) {
          if (grade >= 8.5) gradeName = 'Xuất sắc';
          else if (grade >= 8.0) gradeName = 'Giỏi';
          else if (grade >= 7.0) gradeName = 'Khá';
          else if (grade >= 5.5) gradeName = 'Trung bình';
          else if (grade >= 4.0) gradeName = 'Yếu';
          else gradeName = 'Kém';
        }

        const row = worksheet.addRow({
          semester: '',
          subjectCode: enrollment.classSection.subject?.subjectCode || 'N/A',
          subjectName: enrollment.classSection.subject?.subjectName || 'N/A',
          credits: enrollment.classSection.subject?.credits || 0,
          midtermScore: enrollment.midtermScore !== null ? Number(enrollment.midtermScore).toFixed(1) : '',
          finalScore: enrollment.finalScore !== null ? Number(enrollment.finalScore).toFixed(1) : '',
          assignmentScore: enrollment.assignmentScore !== null ? Number(enrollment.assignmentScore).toFixed(1) : '',
          continuousScore: enrollment.continuousScore !== null ? Number(enrollment.continuousScore).toFixed(1) : '',
          grade: enrollment.grade !== null ? Number(enrollment.grade).toFixed(1) : '',
          gradeName: gradeName,
          status: enrollment.status
        });

        // Style data rows
        row.alignment = { horizontal: 'center', vertical: 'center' };

        // Color code grades
        const gradeCell = row.getCell('grade');
        if (grade >= 8.5) {
          gradeCell.font = { color: { argb: 'FF16a34a' }, bold: true };
        } else if (grade >= 8.0) {
          gradeCell.font = { color: { argb: 'FF0ea5e9' }, bold: true };
        } else if (grade >= 7.0) {
          gradeCell.font = { color: { argb: 'FF10b981' }, bold: true };
        } else if (grade >= 5.5) {
          gradeCell.font = { color: { argb: 'FFf59e0b' }, bold: true };
        } else if (grade >= 4.0) {
          gradeCell.font = { color: { argb: 'FFf97316' }, bold: true };
        } else if (grade < 4.0) {
          gradeCell.font = { color: { argb: 'FFdc2626' }, bold: true };
        }

        rowIndex++;
      }

      return await workbook.xlsx.writeBuffer();
    } catch (error) {
      console.error('Error in generateExcel:', error);
      throw new Error(`Lỗi tạo file Excel: ${error.message}`);
    }
  }

  /**
   * Tạo file PDF cho báo cáo điểm
   */
  async generatePDF(enrollments, studentInfo) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(24).font('Helvetica-Bold').text('BÁO CÁO ĐIỂM', { align: 'center' });
        doc.moveDown(0.5);

        // Student info
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Sinh viên: ${studentInfo.fullName}`, { align: 'left' });
        doc.text(`Mã số: ${studentInfo.studentCode}`, { align: 'left' });
        doc.fontSize(10).font('Helvetica').text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, { align: 'left' });
        doc.moveDown(1);

        // Prepare data by semester
        const groupedBySemester = {};
        for (const enrollment of enrollments) {
          if (!enrollment.classSection) continue;
          const semester = `Kỳ ${enrollment.classSection.semester} - ${enrollment.classSection.academicYear}`;
          if (!groupedBySemester[semester]) {
            groupedBySemester[semester] = [];
          }
          groupedBySemester[semester].push(enrollment);
        }

        // Add semester sections
        for (const [semester, semesterEnrollments] of Object.entries(groupedBySemester)) {
          doc.fontSize(14).font('Helvetica-Bold').text(semester, { underline: true });
          doc.moveDown(0.5);

          // Table header
          const columns = [
            { label: 'Mã môn', width: 70 },
            { label: 'Tên môn', width: 150 },
            { label: 'TC', width: 30 },
            { label: 'GK', width: 35 },
            { label: 'CK', width: 35 },
            { label: 'BT', width: 35 },
            { label: 'Điểm', width: 40 }
          ];

          const xPos = doc.page.margins.left;
          const headerY = doc.y;
          const rowHeight = 20;

          // Draw header
          doc.fontSize(9).font('Helvetica-Bold');
          let colX = xPos;
          for (const col of columns) {
            doc.rect(colX, headerY, col.width, rowHeight).stroke();
            doc.text(col.label, colX + 2, headerY + 4, { width: col.width - 4, align: 'center' });
            colX += col.width;
          }

          // Draw data rows
          doc.fontSize(9).font('Helvetica');
          let currentY = headerY + rowHeight;

          for (const enrollment of semesterEnrollments) {
            const grade = Number(enrollment.grade);
            const gradeName = this.getGradeName(grade);

            colX = xPos;
            const dataRow = [
              enrollment.classSection.subject?.subjectCode || 'N/A',
              enrollment.classSection.subject?.subjectName || 'N/A',
              enrollment.classSection.subject?.credits || 0,
              enrollment.midtermScore !== null ? Number(enrollment.midtermScore).toFixed(1) : '-',
              enrollment.finalScore !== null ? Number(enrollment.finalScore).toFixed(1) : '-',
              enrollment.assignmentScore !== null ? Number(enrollment.assignmentScore).toFixed(1) : '-',
              enrollment.grade !== null ? `${Number(enrollment.grade).toFixed(1)} (${gradeName})` : 'N/A'
            ];

            for (let i = 0; i < columns.length; i++) {
              doc.rect(colX, currentY, columns[i].width, rowHeight).stroke();
              doc.text(dataRow[i], colX + 2, currentY + 4, { width: columns[i].width - 4, align: 'center' });
              colX += columns[i].width;
            }

            currentY += rowHeight;
          }

          doc.moveDown(3);
        }

        doc.fontSize(10).font('Helvetica-Italic').text('Tài liệu này được tạo tự động từ hệ thống quản lý điểm.', {
          align: 'center',
          color: '#666666'
        });

        doc.end();
      } catch (error) {
        console.error('Error in generatePDF:', error);
        reject(new Error(`Lỗi tạo file PDF: ${error.message}`));
      }
    });
  }

  /**
   * Hàm helper: lấy tên xếp loại từ điểm
   */
  getGradeName(grade) {
    if (isNaN(grade)) return 'N/A';
    if (grade >= 8.5) return 'Xuất sắc';
    if (grade >= 8.0) return 'Giỏi';
    if (grade >= 7.0) return 'Khá';
    if (grade >= 5.5) return 'Trung bình';
    if (grade >= 4.0) return 'Yếu';
    return 'Kém';
  }
}

module.exports = new ExportService();
