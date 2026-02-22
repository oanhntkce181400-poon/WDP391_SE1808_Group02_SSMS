const mongoose = require("mongoose");
const Teacher = require("../../models/teacher.model");
const User = require("../../models/user.model");

/**
 * Convert string to ObjectId safely
 */
function toObjectId(id) {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

/* ── Teacher queries ─────────────────── */

async function countLecturers(filter) {
  return Teacher.countDocuments(filter);
}

async function findLecturers(filter, { page, limit }) {
  return Teacher.find(filter)
    .populate("userId", "email status lastLoginAt")
    .sort({ fullName: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
}

async function findLecturerById(id) {
  return Teacher.findById(toObjectId(id))
    .populate("userId", "email status lastLoginAt")
    .lean();
}

async function findTeacherByCode(teacherCode) {
  return Teacher.findOne({ teacherCode }).lean();
}

async function findTeacherByEmail(email) {
  return Teacher.findOne({ email }).lean();
}

async function createTeacher(data, session) {
  const [teacher] = await Teacher.create([data], { session });
  return teacher;
}

async function updateLecturerById(id, updateFields) {
  const teacher = await Teacher.findById(toObjectId(id));
  return teacher; // caller modifies and saves, or use below direct update
}

async function directUpdateLecturerById(id, data) {
  return Teacher.findByIdAndUpdate(
    toObjectId(id),
    { $set: data },
    { new: true },
  )
    .populate("userId", "email status")
    .lean();
}

async function saveLecturerDoc(doc) {
  return doc.save();
}

async function findTeacherDocById(id) {
  // Returns Mongoose document (not lean) for save operations
  return Teacher.findById(toObjectId(id));
}

/* ── User queries ────────────────────── */

async function findUserByEmail(email) {
  return User.findOne({ email }).lean();
}

async function createUser(data, session) {
  const [user] = await User.create([data], { session });
  return user;
}

async function updateUserById(id, data) {
  return User.findByIdAndUpdate(toObjectId(id), { $set: data });
}

module.exports = {
  countLecturers,
  findLecturers,
  findLecturerById,
  findTeacherByCode,
  findTeacherByEmail,
  findTeacherDocById,
  createTeacher,
  updateLecturerById,
  directUpdateLecturerById,
  saveLecturerDoc,
  findUserByEmail,
  createUser,
  updateUserById,
};
