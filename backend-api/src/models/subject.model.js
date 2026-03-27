const mongoose = require('mongoose');

const prerequisiteSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
});

const majorRequirementSchema = new mongoose.Schema({
  majorCode: { type: String, required: true },
  isRequired: { type: Boolean, default: true },
});

const gradingWeightsSchema = new mongoose.Schema(
  {
    GK: {
      type: Number,
      min: 0,
      max: 100,
      default: 30,
    },
    CK: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    BT: {
      type: Number,
      min: 0,
      max: 100,
      default: 20,
    },
    PT: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    QT: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  { _id: false },
);

const subjectSchema = new mongoose.Schema(
  {
    subjectCode: { type: String, required: true, unique: true, trim: true },
    subjectName: { type: String, required: true, trim: true },
    credits: { type: Number, required: true },
    tuitionFee: { type: Number, default: 0 },
    majorCode: { type: String, trim: true },
    majorCodes: [{ type: String, trim: true }],
    isCommon: { type: Boolean, default: false },
    facultyCode: { type: String, trim: true },
    majorRequirements: [majorRequirementSchema],
    description: { type: String, trim: true },
    prerequisites: [prerequisiteSchema],
    teachers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
      },
    ],
    suggestedSemester: { type: Number, min: 1, max: 9, default: 1 },
    gradingWeights: {
      type: gradingWeightsSchema,
      default: () => ({
        GK: 30,
        CK: 50,
        BT: 20,
        PT: 0,
        QT: 0,
      }),
    },
  },
  { timestamps: true },
);

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
