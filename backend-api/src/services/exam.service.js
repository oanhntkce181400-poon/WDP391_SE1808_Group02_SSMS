const examRepository = require("../modules/exam/exam.repository");

/**
 * ExamService - Business logic layer for Exam management
 * Implements service layer as per class diagram
 */

/**
 * Validate exam data
 * @param {Object} examDto - Exam data transfer object
 * @throws {Error} If validation fails
 */
function validate(examDto) {
  const errors = [];

  if (!examDto.examCode || !examDto.examCode.trim()) {
    errors.push("Exam code is required");
  }

  if (!examDto.subject) {
    errors.push("Subject is required");
  }

  if (!examDto.room) {
    errors.push("Room is required");
  }

  if (!examDto.slot) {
    errors.push("Timeslot is required");
  }

  if (!examDto.examDate) {
    errors.push("Exam date is required");
  }

  if (!examDto.startTime) {
    errors.push("Start time is required");
  }

  if (!examDto.endTime) {
    errors.push("End time is required");
  }

  if (examDto.startTime && examDto.endTime && examDto.startTime >= examDto.endTime) {
    errors.push("End time must be after start time");
  }

  if (!examDto.maxCapacity || examDto.maxCapacity <= 0) {
    errors.push("Max capacity must be greater than 0");
  }

  if (errors.length > 0) {
    const error = new Error(errors.join(", "));
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }
}

/**
 * Check if room has conflict on the given date and slot
 * @param {String} roomId - Room ID
 * @param {Date} examDate - Exam date
 * @param {String} slotId - Slot ID
 * @param {String} excludeExamId - Exam ID to exclude (for update check)
 * @returns {Promise<Object>} { hasConflict: boolean, conflictingExam: Object }
 */
async function checkRoomConflict(roomId, examDate, slotId, excludeExamId = null) {
  const conflictingExams = await examRepository.findByRoomAndSlot(
    roomId,
    examDate,
    slotId,
    excludeExamId
  );

  if (conflictingExams.length > 0) {
    return {
      hasConflict: true,
      conflictingExam: conflictingExams[0],
      message: `Room conflict: ${conflictingExams[0].room?.roomName || "Room"} is already booked for ${conflictingExams[0].slot?.groupName || "this slot"} on this date`,
    };
  }

  return {
    hasConflict: false,
    conflictingExam: null,
    message: null,
  };
}

/**
 * Check if students enrolled in the subject have conflicting exams
 * @param {String} subjectId - Subject ID
 * @param {Date} examDate - Exam date
 * @param {String} slotId - Slot ID
 * @returns {Promise<Object>} { hasConflict: boolean, conflictCount: number, message: string }
 */
async function checkStudentConflict(subjectId, examDate, slotId) {
  // Get all exams on the same date and slot for this subject
  const sameSlotExams = await examRepository.findBySubjectDateSlot(
    subjectId,
    examDate,
    slotId
  );

  // If there are already exams for this subject on this slot, that's a conflict
  if (sameSlotExams.length > 0) {
    return {
      hasConflict: true,
      conflictCount: sameSlotExams.length,
      message: `Student conflict: This subject already has ${sameSlotExams.length} exam(s) scheduled at the same time`,
      conflictingExams: sameSlotExams,
    };
  }

  return {
    hasConflict: false,
    conflictCount: 0,
    message: null,
    conflictingExams: [],
  };
}

/**
 * Validate exam creation - check all conflicts
 * @param {Object} examDto - Exam data
 * @returns {Promise<Object>} { isValid: boolean, errors: Array }
 */
async function validateExamCreation(examDto) {
  const validationErrors = [];

  // Basic validation
  try {
    validate(examDto);
  } catch (error) {
    return {
      isValid: false,
      errors: error.errors || [error.message],
    };
  }

  // Check room conflict
  const roomConflict = await checkRoomConflict(
    examDto.room,
    examDto.examDate,
    examDto.slot
  );

  if (roomConflict.hasConflict) {
    validationErrors.push(roomConflict.message);
  }

  // Check student conflict
  const studentConflict = await checkStudentConflict(
    examDto.subject,
    examDto.examDate,
    examDto.slot
  );

  if (studentConflict.hasConflict) {
    validationErrors.push(studentConflict.message);
  }

  return {
    isValid: validationErrors.length === 0,
    errors: validationErrors,
    roomConflict,
    studentConflict,
  };
}

/**
 * Validate exam update - check conflicts excluding current exam
 * @param {String} examId - Current exam ID
 * @param {Object} updates - Update data
 * @returns {Promise<Object>} { isValid: boolean, errors: Array }
 */
async function validateExamUpdate(examId, updates) {
  const validationErrors = [];

  // If room, date, or slot is being updated, check conflicts
  if (updates.room || updates.examDate || updates.slot) {
    const currentExam = await examRepository.findById(examId);
    
    if (!currentExam) {
      return {
        isValid: false,
        errors: ["Exam not found"],
      };
    }

    const roomToCheck = updates.room || currentExam.room._id;
    const dateToCheck = updates.examDate || currentExam.examDate;
    const slotToCheck = updates.slot || currentExam.slot._id;

    // Check room conflict (excluding current exam)
    const roomConflict = await checkRoomConflict(
      roomToCheck,
      dateToCheck,
      slotToCheck,
      examId
    );

    if (roomConflict.hasConflict) {
      validationErrors.push(roomConflict.message);
    }

    // Check student conflict if subject is involved
    const subjectToCheck = updates.subject || currentExam.subject._id;
    const studentConflict = await checkStudentConflict(
      subjectToCheck,
      dateToCheck,
      slotToCheck
    );

    // Allow if the only conflicting exam is the current exam itself
    const otherConflicts = studentConflict.conflictingExams?.filter(
      (e) => e._id.toString() !== examId.toString()
    );

    if (otherConflicts && otherConflicts.length > 0) {
      validationErrors.push(
        `Student conflict: ${otherConflicts.length} other exam(s) scheduled at the same time`
      );
    }
  }

  return {
    isValid: validationErrors.length === 0,
    errors: validationErrors,
  };
}

/**
 * Get enrolled students for an exam
 * @param {String} examId - Exam ID
 * @returns {Promise<Array>} Array of students
 */
async function getEnrolledStudents(examId) {
  return examRepository.getEnrolledStudents(examId);
}

/**
 * Notify students about exam (with Socket.IO integration)
 * @param {Object} exam - Exam object
 * @param {String} action - Action type: 'created', 'updated', 'deleted'
 * @returns {Promise<void>}
 */
async function notifyStudents(exam, action) {
  // Get students enrolled in this exam
  const students = await getEnrolledStudents(exam._id);

  if (students.length === 0) {
    console.log(`No students to notify for exam ${exam.examCode}`);
    return;
  }

  // Prepare notification message
  let message = "";
  let title = "";

  switch (action) {
    case "created":
      title = "New Exam Schedule";
      message = `A new exam has been scheduled for ${exam.subject?.subjectName || "your subject"}`;
      break;
    case "updated":
      title = "Exam Schedule Updated";
      message = `The exam schedule for ${exam.subject?.subjectName || "your subject"} has been updated`;
      break;
    case "deleted":
      title = "Exam Cancelled";
      message = `The exam for ${exam.subject?.subjectName || "your subject"} has been cancelled`;
      break;
    default:
      title = "Exam Notification";
      message = "Exam schedule notification";
  }

  // Log notification
  console.log(`[ExamService] Notification to ${students.length} students:`);
  console.log(`  Title: ${title}`);
  console.log(`  Message: ${message}`);
  console.log(`  Exam: ${exam.examCode} - ${exam.subject?.subjectName || "N/A"}`);
  console.log(`  Date: ${exam.examDate} | Time: ${exam.startTime} - ${exam.endTime}`);
  console.log(`  Room: ${exam.room?.roomName || "N/A"}`);

  // Try to get Socket.IO instance and send notifications
  try {
    const app = require('../index');
    const io = app.io;

    if (io && io.sendToUser) {
      const notificationData = {
        title,
        message,
        type: 'exam-notification',
        action,
        exam: {
          _id: exam._id,
          examCode: exam.examCode,
          subject: exam.subject?.subjectName || "N/A",
          examDate: exam.examDate,
          startTime: exam.startTime,
          endTime: exam.endTime,
          room: exam.room?.roomName || "N/A",
          status: exam.status,
        },
        timestamp: new Date(),
      };

      students.forEach((student) => {
        if (student._id) {
          io.sendToUser(student._id.toString(), 'exam-notification', notificationData);
        }
      });

      console.log(`  ✅ Socket.IO notifications sent to ${students.length} students`);
    } else {
      console.log(`  ⚠️  Socket.IO not available, notifications logged only`);
    }
  } catch (error) {
    console.error(`  ❌ Error sending Socket.IO notifications:`, error.message);
  }

  return {
    notified: students.length,
    students: students.map((s) => ({
      id: s._id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      email: s.email,
    })),
  };
}

module.exports = {
  validate,
  checkRoomConflict,
  checkStudentConflict,
  validateExamCreation,
  validateExamUpdate,
  getEnrolledStudents,
  notifyStudents,
};
