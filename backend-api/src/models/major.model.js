const mongoose = require('mongoose');

const majorSchema = new mongoose.Schema(
  {
    majorCode: { type: String, required: true, unique: true, trim: true },
    majorName: { type: String, required: true, trim: true },
    majorNameEn: { type: String, trim: true },
    faculty: { type: String, trim: true },
    studentCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Major = mongoose.model('Major', majorSchema);

module.exports = Major;
