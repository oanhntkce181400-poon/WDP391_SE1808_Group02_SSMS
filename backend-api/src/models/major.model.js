const mongoose = require('mongoose');

const majorSchema = new mongoose.Schema(
  {
    majorCode: { type: String, required: true, unique: true, trim: true },
    majorName: { type: String, required: true, trim: true },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
    },
    studentCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Major = mongoose.model('Major', majorSchema);

module.exports = Major;
