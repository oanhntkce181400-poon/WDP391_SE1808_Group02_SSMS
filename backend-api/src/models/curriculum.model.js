// curriculum.model.js
const mongoose = require('mongoose');

const curriculumSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    major: { type: String, required: true, trim: true },
    majorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Major' 
    },
    academicYear: { type: String, required: true, trim: true },
    version: { type: Number, default: 1 }, // Phiên bản CTĐT
    description: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    totalCredits: { type: Number, default: 0 },
    totalCourses: { type: Number, default: 0 },
    
    // Cấu trúc cũ (embedded) - giữ lại để backward compatibility
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
    }],
    
    // Cấu trúc mới (relational) - sử dụng CurriculumSemester và CurriculumCourse
    useRelationalStructure: { 
      type: Boolean, 
      default: false 
    }
  },
  { timestamps: true }
);

// Index for version queries
curriculumSchema.index({ major: 1, academicYear: 1, version: 1 });

const Curriculum = mongoose.model('Curriculum', curriculumSchema);

module.exports = Curriculum;
