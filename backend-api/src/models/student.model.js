const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentCode: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    majorCode: { type: String, required: true, trim: true },
    cohort: { type: Number, required: true },
    curriculum: { type: mongoose.Schema.Types.ObjectId, ref: 'Curriculum', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
