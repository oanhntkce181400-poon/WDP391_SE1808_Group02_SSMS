const Exam = require("../../models/exam.model");
const StudentExam = require("../../models/studentExam.model");
const ClassEnrollment = require("../../models/classEnrollment.model");

/**
 * ExamRepository - Data access layer for Exam entity
 * Implements repository pattern as per class diagram
 */

/**
 * Find exams with filters and pagination
 * @param {Object} filter - Query filters
 * @param {Object} options - Pagination and sort options
 * @returns {Promise<Array>} Array of exams
 */
async function findWithFilter(filter, options = {}) {
  const { skip = 0, limit = 10, sort = { examDate: -1 } } = options;

  return Exam.find(filter)
    .populate("subject", "subjectCode subjectName credits")
    .populate("classSection", "classCode className")
    .populate("room", "roomCode roomName capacity roomType")
    .populate("slot", "groupName startTime endTime")
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();
}

/**
 * Count exams matching filter
 * @param {Object} filter - Query filters
 * @returns {Promise<Number>} Count of exams
 */
async function countExams(filter) {
  return Exam.countDocuments(filter).exec();
}

/**
 * Find exam by ID
 * @param {String} id - Exam ID
 * @returns {Promise<Object>} Exam document
 */
async function findById(id) {
  return Exam.findById(id)
    .populate("subject", "subjectCode subjectName credits")
    .populate("classSection", "classCode className")
    .populate("room", "roomCode roomName capacity roomType")
    .populate("slot", "groupName startTime endTime startDate endDate")
    .exec();
}

/**
 * Find exams by room, date, and slot (for conflict checking)
 * @param {String} roomId - Room ID
 * @param {Date} examDate - Exam date
 * @param {String} slotId - Slot ID
 * @param {String} excludeExamId - Exam ID to exclude (for update conflict check)
 * @returns {Promise<Array>} Array of conflicting exams
 */
async function findByRoomAndSlot(roomId, examDate, slotId, excludeExamId = null) {
  const filter = {
    room: roomId,
    examDate: examDate,
    slot: slotId,
    status: { $ne: "cancelled" },
  };

  if (excludeExamId) {
    filter._id = { $ne: excludeExamId };
  }

  return Exam.find(filter)
    .populate("room", "roomCode roomName")
    .populate("slot", "groupName startTime endTime")
    .lean()
    .exec();
}

/**
 * Find exams by subject, date, and slot (for student conflict checking)
 * @param {String} subjectId - Subject ID
 * @param {Date} examDate - Exam date
 * @param {String} slotId - Slot ID
 * @returns {Promise<Array>} Array of exams
 */
async function findBySubjectDateSlot(subjectId, examDate, slotId) {
  return Exam.find({
    subject: subjectId,
    examDate: examDate,
    slot: slotId,
    status: { $ne: "cancelled" },
  })
    .populate("subject", "subjectCode subjectName")
    .lean()
    .exec();
}

/**
 * Find exams for a specific student on a date and slot
 * Used to check if student has conflicting exams
 * @param {String} studentId - Student ID
 * @param {Date} examDate - Exam date
 * @param {String} slotId - Slot ID
 * @returns {Promise<Array>} Array of exams the student is enrolled in
 */
async function findByStudentAndSlot(studentId, examDate, slotId) {
  // Step 1: Get all enrolled classes for the student
  const enrollments = await ClassEnrollment.find({
    student: studentId,
    status: { $in: ["enrolled", "active", "completed"] },
  })
    .select("classSection")
    .lean()
    .exec();

  if (enrollments.length === 0) {
    return [];
  }

  const classSectionIds = enrollments.map((e) => e.classSection);

  // Step 2: Find exams for those classes on the same date and slot
  return Exam.find({
    classSection: { $in: classSectionIds },
    examDate: examDate,
    slot: slotId,
    status: { $ne: "cancelled" },
  })
    .populate("subject", "subjectCode subjectName")
    .populate("classSection", "classCode className")
    .lean()
    .exec();
}

/**
 * Save new exam
 * @param {Object} examData - Exam data
 * @returns {Promise<Object>} Created exam
 */
async function save(examData) {
  const exam = new Exam(examData);
  await exam.save();
  return findById(exam._id);
}

/**
 * Update exam by ID
 * @param {String} id - Exam ID
 * @param {Object} updates - Update data
 * @returns {Promise<Object>} Updated exam
 */
async function update(id, updates) {
  return Exam.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  })
    .populate("subject", "subjectCode subjectName credits")
    .populate("classSection", "classCode className")
    .populate("room", "roomCode roomName capacity roomType")
    .populate("slot", "groupName startTime endTime")
    .exec();
}

/**
 * Delete exam by ID
 * @param {String} id - Exam ID
 * @returns {Promise<Object>} Deleted exam
 */
async function deleteById(id) {
  return Exam.findByIdAndDelete(id).exec();
}

/**
 * Get all students enrolled in classes that have this exam
 * @param {String} examId - Exam ID
 * @returns {Promise<Array>} Array of student IDs
 */
async function getEnrolledStudents(examId) {
  const exam = await Exam.findById(examId).select("classSection subject").exec();
  
  if (!exam) {
    return [];
  }

  // If exam has classSection, get students from that class
  if (exam.classSection) {
    const enrollments = await ClassEnrollment.find({
      classSection: exam.classSection,
      status: { $in: ["enrolled", "active", "completed"] },
    })
      .populate("student", "studentCode fullName email")
      .lean()
      .exec();

    return enrollments.map((e) => e.student);
  }

  // If no classSection, get all students enrolled in any class with this subject
  const classesWithSubject = await require("../../models/classSection.model")
    .find({ subject: exam.subject })
    .select("_id")
    .lean()
    .exec();

  const classSectionIds = classesWithSubject.map((c) => c._id);

  const enrollments = await ClassEnrollment.find({
    classSection: { $in: classSectionIds },
    status: { $in: ["enrolled", "active", "completed"] },
  })
    .populate("student", "studentCode fullName email")
    .lean()
    .exec();

  return enrollments.map((e) => e.student);
}

/**
 * Delete all student exam records for a given exam
 * @param {String} examId - Exam ID
 * @returns {Promise<Object>} Delete result
 */
async function deleteStudentExams(examId) {
  return StudentExam.deleteMany({ exam: examId }).exec();
}

module.exports = {
  findWithFilter,
  countExams,
  findById,
  findByRoomAndSlot,
  findBySubjectDateSlot,
  findByStudentAndSlot,
  save,
  update,
  deleteById,
  getEnrolledStudents,
  deleteStudentExams,
};
