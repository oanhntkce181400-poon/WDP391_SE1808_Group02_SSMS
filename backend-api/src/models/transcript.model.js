const mongoose = require('mongoose');

const transcriptSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  generatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  semesterRange: {
    from: Number,
    to: Number
  },
  pdfPath: { type: String },
  status: { 
    type: String, 
    enum: ['generated', 'downloaded', 'expired'], 
    default: 'generated' 
  },
  metadata: {
    totalCredits: Number,
    cumulativeGPA: Number,
    semestersIncluded: [Number]
  }
}, { timestamps: true });

transcriptSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model('Transcript', transcriptSchema);
