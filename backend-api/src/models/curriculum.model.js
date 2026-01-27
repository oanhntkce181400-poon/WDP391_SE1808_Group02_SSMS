const mongoose = require('mongoose');

const curriculumSchema = new mongoose.Schema(
  {
    curriculumCode: { type: String, required: true, unique: true, trim: true },
    cohort: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  },
  { timestamps: true },
);

const Curriculum = mongoose.model('Curriculum', curriculumSchema);

module.exports = Curriculum;
