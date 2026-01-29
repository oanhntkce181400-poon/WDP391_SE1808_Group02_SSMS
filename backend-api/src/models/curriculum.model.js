const mongoose = require('mongoose');

const curriculumSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    major: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    totalCredits: { type: Number, default: 0 },
    totalCourses: { type: Number, default: 0 },
    semesters: [{
      id: { type: Number, required: true },
      name: { type: String, required: true },
      credits: { type: Number, default: 0 },
      courses: [{
        code: { type: String, required: true },
        name: { type: String, required: true },
        credits: { type: Number, required: true },
        hasPrerequisite: { type: Boolean, default: false }
      }]
    }]
  },
  { timestamps: true },
);

const Curriculum = mongoose.model('Curriculum', curriculumSchema);

module.exports = Curriculum;
