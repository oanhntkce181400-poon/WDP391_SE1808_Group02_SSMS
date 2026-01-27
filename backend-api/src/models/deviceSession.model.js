const mongoose = require('mongoose');

const deviceSessionSchema = new mongoose.Schema(
  {
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ipAddress: { type: String, required: true, trim: true },
    userAgent: { type: String, trim: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

deviceSessionSchema.index({ device: 1, isActive: 1 });
deviceSessionSchema.index({ user: 1, isActive: 1 });
deviceSessionSchema.index({ startedAt: -1 });

const DeviceSession = mongoose.model('DeviceSession', deviceSessionSchema);

module.exports = DeviceSession;
