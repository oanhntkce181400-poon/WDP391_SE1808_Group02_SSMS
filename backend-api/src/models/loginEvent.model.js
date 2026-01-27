const mongoose = require('mongoose');

const loginEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
    deviceSession: { type: mongoose.Schema.Types.ObjectId, ref: 'DeviceSession' },
    ipAddress: { type: String, required: true, trim: true },
    userAgent: { type: String, trim: true },
    location: { type: String, trim: true },
    accessTokenJti: { type: String, trim: true },
    refreshTokenJti: { type: String, trim: true },
    familyId: { type: String, trim: true },
    eventType: {
      type: String,
      enum: ['login', 'logout', 'refresh', 'password-reset'],
      required: true,
    },
    success: { type: Boolean, required: true },
    failureReason: { type: String, trim: true },
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

loginEventSchema.index({ user: 1, occurredAt: -1 });
loginEventSchema.index({ eventType: 1, occurredAt: -1 });
loginEventSchema.index({ familyId: 1, occurredAt: -1 });

const LoginEvent = mongoose.model('LoginEvent', loginEventSchema);

module.exports = LoginEvent;
