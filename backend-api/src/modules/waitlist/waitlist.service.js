// waitlist.service.js
// Service cho module waitlist - xử lý logic nghiệp vụ
const waitlistRepo = require('./waitlist.repository');
const ClassSection = require('../../models/classSection.model');
const ClassEnrollment = require('../../models/classEnrollment.model');
const Student = require('../../models/student.model');
const Subject = require('../../models/subject.model');
const User = require('../../models/user.model');

const waitlistService = {
  /**
   * API 1: Join Waitlist - Sinh viên đăng ký vào danh sách chờ
   * @param {string} userId - ID từ token (User model)
   * @param {string} subjectId - ID của môn học
   * @param {number} targetSemester - Kỳ học dự kiến
   * @param {string} targetAcademicYear - Năm học dự kiến
   */
  async joinWaitlist(userId, subjectId, targetSemester, targetAcademicYear) {
    // 1. Tìm User từ token
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 2. Tìm Student từ User (qua userId hoặc email)
    let student = await Student.findOne({ userId: userId });
    if (!student) {
      // Thử tìm theo email
      student = await Student.findOne({ email: user.email });
    }
    if (!student) {
      throw new Error('Student not found - Vui lòng liên hệ admin để cập nhật thông tin sinh viên');
    }
    const studentId = student._id;

    // 3. Kiểm tra SV đã ở waitlist chưa (status = WAITING)
    const existing = await waitlistRepo.findOne({
      student: studentId,
      subject: subjectId,
      status: 'WAITING'
    });
    if (existing) {
      throw new Error('Student is already on waitlist for this subject');
    }

    // 4. Kiểm tra SV còn active
    if (!student.isActive) {
      throw new Error('Student account is not active');
    }
    if (student.academicStatus === 'on-leave') {
      throw new Error('Student is on leave, cannot join waitlist');
    }
    if (student.academicStatus === 'dropped') {
      throw new Error('Student has dropped out, cannot join waitlist');
    }
    if (student.academicStatus === 'graduated') {
      throw new Error('Student has graduated, cannot join waitlist');
    }

    // 5. Kiểm tra môn học tồn tại
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      throw new Error('Subject not found');
    }

    // 6. Kiểm tra SV đã học môn này CHƯA (từ enrollment + completed)
    // Nếu đã học/hiện đang học → KHÔNG cho join waitlist (vì đã hoàn thành rồi)
    const enrollments = await ClassEnrollment.find({
      student: studentId,
      status: { $in: ['enrolled', 'completed'] }
    }).populate('classSection');

    const enrolledSubjectIds = enrollments
      .map(e => e.classSection?.subject?.toString())
      .filter(Boolean);

    if (enrolledSubjectIds.includes(subjectId.toString())) {
      throw new Error('Bạn đã hoàn thành môn này rồi, không thể đăng ký bảo lưu');
    }

    // 7. Insert vào waitlist với status = WAITING
    return waitlistRepo.create({
      student: studentId,
      subject: subjectId,
      targetSemester,
      targetAcademicYear,
      status: 'WAITING'
    });
  },

  /**
   * API 2: Auto Assign - Tự động đẩy SV từ waitlist vào lớp khi có lớp mới
   * Được gọi sau khi Academic Admin tạo lớp thành công
   * @param {string} subjectId - ID của môn học
   * @param {number} semester - Kỳ học
   * @param {string} academicYear - Năm học
   */
  async processWaitlist(subjectId, semester, academicYear) {
    console.log(`[Waitlist] Processing waitlist for subject ${subjectId}, semester ${semester}, year ${academicYear}`);

    // 1. Tìm tất cả SV đang chờ (WAITING) cho môn này, kỳ này
    const waitlistStudents = await waitlistRepo.findWaitlist(
      {
        subject: subjectId,
        targetSemester: semester,
        targetAcademicYear: academicYear,
        status: 'WAITING'
      },
      {
        populate: 'student',
        sort: { createdAt: 1 } // Ai đăng ký trước thì được ưu tiên trước
      }
    );

    if (waitlistStudents.length === 0) {
      console.log(`[Waitlist] No students in waitlist for this subject`);
      return { processed: 0, enrolled: 0, results: [] };
    }

    console.log(`[Waitlist] Found ${waitlistStudents.length} students in waitlist`);

    // 2. Tìm các lớp còn slot của môn này, kỳ này
    const availableClasses = await ClassSection.find({
      subject: subjectId,
      semester: semester,
      academicYear: academicYear,
      status: 'published',
      $expr: { $lt: ['$currentEnrollment', '$maxCapacity'] }
    }).sort({ currentEnrollment: 1 }); // Ưu tiên lớp ít người nhất

    if (availableClasses.length === 0) {
      console.log(`[Waitlist] No available classes with slots`);
      return { processed: 0, enrolled: 0, results: [] };
    }

    console.log(`[Waitlist] Found ${availableClasses.length} available classes`);

    const results = [];
    let enrolledCount = 0;

    // 3. Duyệt từng SV trong waitlist
    for (const waitlistItem of waitlistStudents) {
      // 3.1 Kiểm tra lại SV vẫn còn eligible không
      const student = await Student.findById(waitlistItem.student);
      if (!student || !student.isActive || student.academicStatus !== 'enrolled') {
        // SV không còn eligible → hủy waitlist
        await waitlistRepo.updateStatus(waitlistItem._id, 'CANCELLED', {
          cancelledAt: new Date(),
          cancelReason: student 
            ? `Student status changed to ${student.academicStatus}` 
            : 'Student not found'
        });
        results.push({
          studentId: waitlistItem.student,
          status: 'CANCELLED',
          reason: 'Student status not eligible'
        });
        continue;
      }

      // 3.2 Kiểm tra SV đã đăng ký môn này chưa (phòng trường hợp đã đăng ký thủ công)
      const alreadyEnrolled = await ClassEnrollment.findOne({
        student: waitlistItem.student,
        status: { $in: ['enrolled', 'completed'] }
      }).populate({
        path: 'classSection',
        match: { subject: subjectId }
      });

      if (alreadyEnrolled && alreadyEnrolled.classSection) {
        // SV đã đăng ký môn này rồi → hủy waitlist
        await waitlistRepo.updateStatus(waitlistItem._id, 'CANCELLED', {
          cancelledAt: new Date(),
          cancelReason: 'Already enrolled in this subject'
        });
        results.push({
          studentId: waitlistItem.student,
          status: 'CANCELLED',
          reason: 'Already enrolled in this subject'
        });
        continue;
      }

      // 3.3 Tìm lớp còn slot
      let assignedClass = null;
      for (const cls of availableClasses) {
        if (cls.currentEnrollment < cls.maxCapacity) {
          assignedClass = cls;
          break;
        }
      }

      if (!assignedClass) {
        // Không còn lớp nào có slot
        results.push({
          studentId: waitlistItem.student,
          status: 'NO_SLOT',
          reason: 'No available class slots'
        });
        continue;
      }

      // 3.4 Enroll SV vào lớp
      try {
        await ClassEnrollment.create({
          classSection: assignedClass._id,
          student: waitlistItem.student,
          status: 'enrolled'
        });

        // 3.5 Cập nhật số lượng enrollment của lớp
        await ClassSection.findByIdAndUpdate(assignedClass._id, {
          $inc: { currentEnrollment: 1 }
        });

        // 3.6 Cập nhật waitlist status = ENROLLED
        await waitlistRepo.updateStatus(waitlistItem._id, 'ENROLLED', {
          enrolledClassSection: assignedClass._id,
          enrolledAt: new Date()
        });

        enrolledCount++;
        results.push({
          studentId: waitlistItem.student,
          classSectionId: assignedClass._id,
          classCode: assignedClass.classCode,
          status: 'ENROLLED'
        });

        console.log(`[Waitlist] Enrolled student ${waitlistItem.student} to class ${assignedClass.classCode}`);

      } catch (err) {
        if (err.code === 11000) {
          // Lỗi trùng lặp (SV đã có trong lớp) → hủy waitlist
          await waitlistRepo.updateStatus(waitlistItem._id, 'CANCELLED', {
            cancelledAt: new Date(),
            cancelReason: 'Already enrolled (duplicate key)'
          });
          results.push({
            studentId: waitlistItem.student,
            status: 'CANCELLED',
            reason: 'Already enrolled in this class'
          });
        } else {
          console.error(`[Waitlist] Error enrolling student ${waitlistItem.student}:`, err);
          results.push({
            studentId: waitlistItem.student,
            status: 'ERROR',
            reason: err.message
          });
        }
      }
    }

    console.log(`[Waitlist] Processed ${waitlistStudents.length} students, enrolled ${enrolledCount}`);

    return {
      processed: waitlistStudents.length,
      enrolled: enrolledCount,
      results
    };
  },

  /**
   * API 3: Lấy danh sách waitlist của 1 sinh viên (theo userId từ token)
   * @param {string} userId - ID từ token (User model)
   */
  async getMyWaitlistByUserId(userId) {
    // Tìm User trước
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Tìm Student từ User
    let student = await Student.findOne({ userId: userId });
    if (!student) {
      student = await Student.findOne({ email: user.email });
    }
    if (!student) {
      return []; // Không có student thì trả về mảng rỗng
    }

    return waitlistRepo.findWaitlist(
      { student: student._id },
      {
        populate: [
          { path: 'subject' },
          { path: 'enrolledClassSection' }
        ],
        sort: { createdAt: -1 }
      }
    );
  },

  /**
   * API 3b: Lấy danh sách waitlist của 1 sinh viên (theo studentId - cho admin)
   * @param {string} studentId - ID của Student model
   */
  async getMyWaitlist(studentId) {
    return waitlistRepo.findWaitlist(
      { student: studentId },
      {
        populate: [
          { path: 'subject' },
          { path: 'enrolledClassSection' }
        ],
        sort: { createdAt: -1 }
      }
    );
  },

  /**
   * API 4: Lấy danh sách waitlist (cho Admin)
   * @param {object} query - Query filter
   */
  async getWaitlist(query = {}) {
    const { subjectId, semester, academicYear, status, page = 1, limit = 10 } = query;
    
    const filter = {};
    if (subjectId) filter.subject = subjectId;
    if (semester) filter.targetSemester = parseInt(semester);
    if (academicYear) filter.targetAcademicYear = academicYear;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [data, total] = await Promise.all([
      waitlistRepo.findWaitlist(filter, {
        populate: [
          { path: 'student', select: 'studentCode fullName email majorCode' },
          { path: 'subject', select: 'subjectCode subjectName credits' },
          { path: 'enrolledClassSection', select: 'classCode className' }
        ],
        sort: { createdAt: -1 },
        limit: parseInt(limit),
        skip
      }),
      waitlistRepo.count(filter)
    ]);

    return {
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    };
  },

  /**
   * API 5: Hủy waitlist (SV tự hủy hoặc Admin hủy)
   * @param {string} waitlistId - ID của waitlist
   * @param {string} reason - Lý do hủy
   */
  async cancelWaitlist(waitlistId, reason = 'Cancelled by user') {
    const waitlist = await waitlistRepo.findById(waitlistId);
    if (!waitlist) {
      throw new Error('Waitlist not found');
    }
    if (waitlist.status !== 'WAITING') {
      throw new Error('Can only cancel waiting waitlist');
    }

    return waitlistRepo.updateStatus(waitlistId, 'CANCELLED', {
      cancelledAt: new Date(),
      cancelReason: reason
    });
  },

  /**
   * API 6: Xóa waitlist (Admin)
   * @param {string} waitlistId - ID của waitlist
   */
  async deleteWaitlist(waitlistId) {
    const waitlist = await waitlistRepo.findById(waitlistId);
    if (!waitlist) {
      throw new Error('Waitlist not found');
    }
    return waitlistRepo.delete(waitlistId);
  }
};

module.exports = waitlistService;
