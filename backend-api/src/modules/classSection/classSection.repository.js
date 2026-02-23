const ClassSection = require("../../models/classSection.model");
const ClassEnrollment = require("../../models/classEnrollment.model");
const Subject = require("../../models/subject.model");
const Student = require("../../models/student.model");

// ─── Class Section ────────────────────────────────

async function countClasses(filter) {
  return ClassSection.countDocuments(filter);
}

async function findClasses(filter, { skip, limit, sort } = {}) {
  return ClassSection.find(filter)
    .populate("subject", "subjectCode subjectName credits")
    .populate("teacher", "teacherCode fullName email department")
    .populate("room", "roomCode roomName capacity")
    .populate("timeslot", "groupName startTime endTime")
    .sort(
      sort || { createdAt: -1, academicYear: -1, semester: -1, classCode: 1 },
    )
    .skip(skip || 0)
    .limit(limit || 10)
    .lean()
    .exec();
}

async function findClassById(id) {
  return ClassSection.findById(id)
    .populate("subject")
    .populate("teacher")
    .populate("room")
    .populate("timeslot")
    .exec();
}

async function findClassByCode(classCode) {
  return ClassSection.findOne({ classCode }).exec();
}

async function createClass(data) {
  const cls = new ClassSection(data);
  await cls.save();
  return findClassById(cls._id);
}

async function updateClassById(id, updates) {
  return ClassSection.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  })
    .populate("subject")
    .populate("teacher")
    .populate("room")
    .populate("timeslot")
    .exec();
}

async function deleteClassById(id) {
  return ClassSection.findByIdAndDelete(id).exec();
}

// ─── Subject search helper ────────────────────────

async function findSubjectIdsBySearch(search) {
  const docs = await Subject.find({
    $or: [
      { subjectCode: { $regex: search, $options: "i" } },
      { subjectName: { $regex: search, $options: "i" } },
    ],
  }).select("_id");
  return docs.map((s) => s._id);
}

// ─── Enrollment ───────────────────────────────────

async function countActiveEnrollments(classId) {
  return ClassEnrollment.countDocuments({
    classSection: classId,
    status: "enrolled",
  });
}

async function findEnrollment(classId, studentId) {
  return ClassEnrollment.findOne({
    classSection: classId,
    student: studentId,
  }).exec();
}

async function findEnrollmentsByStudent(studentId, status) {
  const query = { student: studentId };
  if (status) query.status = status;
  return ClassEnrollment.find(query)
    .populate({
      path: "classSection",
      populate: [
        { path: "subject", select: "subjectCode subjectName credits" },
        { path: "teacher", select: "teacherCode fullName" },
        { path: "room", select: "roomCode roomName" },
        { path: "timeslot", select: "groupName startTime endTime" },
      ],
    })
    .exec();
}

async function findEnrollmentsByClass(classId, status) {
  const query = { classSection: classId };
  if (status) query.status = status;
  return ClassEnrollment.find(query)
    .populate("student", "studentCode fullName email")
    .exec();
}

async function findEnrollmentById(id) {
  return ClassEnrollment.findById(id).exec();
}

async function createEnrollment(data) {
  const enrollment = new ClassEnrollment(data);
  await enrollment.save();
  return ClassEnrollment.findById(enrollment._id)
    .populate("classSection")
    .populate("student")
    .exec();
}

async function updateEnrollmentStatus(id, status) {
  return ClassEnrollment.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  ).exec();
}

async function deleteEnrollmentsByClass(classId) {
  return ClassEnrollment.deleteMany({ classSection: classId }).exec();
}

async function incrementEnrollmentCount(classId) {
  return ClassSection.findByIdAndUpdate(classId, {
    $inc: { currentEnrollment: 1 },
  }).exec();
}

async function decrementEnrollmentCount(classId) {
  return ClassSection.findByIdAndUpdate(
    classId,
    { $inc: { currentEnrollment: -1 } },
    { new: true },
  ).exec();
}

async function findStudentById(studentId) {
  return Student.findById(studentId).exec();
}

async function findClassesByIds(ids) {
  return ClassSection.find({ _id: { $in: ids } })
    .populate("teacher", "fullName")
    .populate("subject", "subjectCode subjectName")
    .lean();
}

async function updateClassStatus(id, status) {
  return ClassSection.findByIdAndUpdate(id, { status }).exec();
}

async function findConflicts(query) {
  return ClassSection.find(query)
    .populate("teacher", "teacherCode fullName")
    .populate("room", "roomCode roomName")
    .populate("timeslot", "groupName startTime endTime")
    .populate("subject", "subjectCode subjectName")
    .lean();
}

module.exports = {
  countClasses,
  findClasses,
  findClassById,
  findClassByCode,
  createClass,
  updateClassById,
  deleteClassById,
  findSubjectIdsBySearch,
  countActiveEnrollments,
  findEnrollment,
  findEnrollmentsByStudent,
  findEnrollmentsByClass,
  findEnrollmentById,
  createEnrollment,
  updateEnrollmentStatus,
  deleteEnrollmentsByClass,
  incrementEnrollmentCount,
  decrementEnrollmentCount,
  findStudentById,
  findClassesByIds,
  updateClassStatus,
  findConflicts,
};
