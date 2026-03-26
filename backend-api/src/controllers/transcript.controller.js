const transcriptService = require('../services/transcript.service');
const Student = require('../models/student.model');

/**
 * @route   GET /api/grades/transcript/preview
 * @desc    Lấy preview bảng điểm
 * @access  Private
 */
exports.previewTranscript = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { role } = req.auth;
    let studentId = req.params.studentId;

    // Sinh viên chỉ được xem bảng điểm của mình
    if (role === 'student') {
      const student = await Student.findOne({ userId });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
      }
      studentId = student._id;
    } else if (!studentId) {
      // Admin/Staff - lấy studentId từ query hoặc từ userId
      const student = await Student.findOne({ userId });
      if (student) {
        studentId = student._id;
      }
    }

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Thiếu studentId' });
    }

    const preview = await transcriptService.getPreview(studentId, {
      semesterFrom: req.query.semesterFrom ? parseInt(req.query.semesterFrom) : null,
      semesterTo: req.query.semesterTo ? parseInt(req.query.semesterTo) : null
    });

    res.json({ success: true, data: preview });
  } catch (error) {
    console.error('previewTranscript error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/grades/transcript/preview/:studentId
 * @desc    Lấy preview bảng điểm của sinh viên cụ thể (Admin/Staff)
 * @access  Private/Admin/Staff
 */
exports.previewStudentTranscript = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Thiếu studentId' });
    }

    const preview = await transcriptService.getPreview(studentId, {
      semesterFrom: req.query.semesterFrom ? parseInt(req.query.semesterFrom) : null,
      semesterTo: req.query.semesterTo ? parseInt(req.query.semesterTo) : null
    });

    res.json({ success: true, data: preview });
  } catch (error) {
    console.error('previewStudentTranscript error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/grades/transcript/generate
 * @desc    Tạo và tải bảng điểm PDF
 * @access  Private
 */
exports.generateTranscript = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { role } = req.auth;
    let studentId = req.params.studentId;

    // Sinh viên chỉ được tạo bảng điểm của mình
    if (role === 'student') {
      const student = await Student.findOne({ userId });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
      }
      studentId = student._id;
    } else if (!studentId) {
      const student = await Student.findOne({ userId });
      if (student) {
        studentId = student._id;
      }
    }

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Thiếu studentId' });
    }

    // Log request
    await transcriptService.logTranscriptRequest(studentId, userId, {
      semesterFrom: req.query.semesterFrom ? parseInt(req.query.semesterFrom) : null,
      semesterTo: req.query.semesterTo ? parseInt(req.query.semesterTo) : null
    });

    // Generate PDF
    const pdfBuffer = await transcriptService.generatePDF(studentId, {
      semesterFrom: req.query.semesterFrom ? parseInt(req.query.semesterFrom) : null,
      semesterTo: req.query.semesterTo ? parseInt(req.query.semesterTo) : null
    });

    // Get student info for filename
    const student = await Student.findById(studentId);

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="BangDiem_${student?.studentCode || 'unknown'}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('generateTranscript error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/grades/transcript/generate/:studentId
 * @desc    Tạo và tải bảng điểm PDF của sinh viên cụ thể (Admin/Staff)
 * @access  Private/Admin/Staff
 */
exports.generateStudentTranscript = async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.auth.sub;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Thiếu studentId' });
    }

    // Log request
    await transcriptService.logTranscriptRequest(studentId, userId, {
      semesterFrom: req.query.semesterFrom ? parseInt(req.query.semesterFrom) : null,
      semesterTo: req.query.semesterTo ? parseInt(req.query.semesterTo) : null
    });

    // Generate PDF
    const pdfBuffer = await transcriptService.generatePDF(studentId, {
      semesterFrom: req.query.semesterFrom ? parseInt(req.query.semesterFrom) : null,
      semesterTo: req.query.semesterTo ? parseInt(req.query.semesterTo) : null
    });

    // Get student info for filename
    const student = await Student.findById(studentId);

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="BangDiem_${student?.studentCode || 'unknown'}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('generateStudentTranscript error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
