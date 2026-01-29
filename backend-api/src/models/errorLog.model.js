const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema(
  {
    statusCode: { type: Number, required: true },
    message: { type: String, required: true },
    path: { type: String, required: true },
    method: { type: String, required: true },
    errorType: { type: String, required: true }, // HttpError, DatabaseError, ValidationError, etc.
    stack: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String },
    requestBody: { type: mongoose.Schema.Types.Mixed },
    requestQuery: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

// Index để tìm kiếm nhanh
errorLogSchema.index({ statusCode: 1, createdAt: -1 });
errorLogSchema.index({ errorType: 1, createdAt: -1 });
errorLogSchema.index({ path: 1, createdAt: -1 });

const ErrorLog = mongoose.model('ErrorLog', errorLogSchema);

module.exports = ErrorLog;
