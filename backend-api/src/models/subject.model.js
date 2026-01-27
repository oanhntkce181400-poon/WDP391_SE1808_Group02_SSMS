const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    subjectCode: { type: String, required: true, unique: true, trim: true },
    subjectName: { type: String, required: true, trim: true },
    credits: { type: Number, required: true },
    majorCode: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
