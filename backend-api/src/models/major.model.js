const mongoose = require('mongoose');

const majorSchema = new mongoose.Schema(
  {
    majorCode: { type: String, required: true, unique: true, trim: true },
    majorName: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Major = mongoose.model('Major', majorSchema);

module.exports = Major;
