const mongoose = require('mongoose');

const pushTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'web', 'unknown'],
      default: 'unknown',
    },
    provider: {
      type: String,
      enum: ['fcm'],
      default: 'fcm',
    },
    deviceName: {
      type: String,
      trim: true,
      default: '',
    },
    appVersion: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

pushTokenSchema.index({ user: 1, isActive: 1 });
pushTokenSchema.index({ platform: 1, isActive: 1 });

const PushToken = mongoose.model('PushToken', pushTokenSchema);

module.exports = PushToken;
