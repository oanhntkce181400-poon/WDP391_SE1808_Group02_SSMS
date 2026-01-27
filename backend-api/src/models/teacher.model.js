const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    teacherCode: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    department: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;
