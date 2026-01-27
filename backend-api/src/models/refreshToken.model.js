const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    jti: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    issuedAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date },
    revokedAt: { type: Date },
    revokeReason: { type: String, trim: true },
    replacedByToken: { type: mongoose.Schema.Types.ObjectId, ref: 'RefreshToken' },
    deviceSession: { type: mongoose.Schema.Types.ObjectId, ref: 'DeviceSession' },
    issuedIp: { type: String, trim: true },
    issuedUserAgent: { type: String, trim: true },
    lastUsedIp: { type: String, trim: true },
    lastUsedUserAgent: { type: String, trim: true },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ user: 1, familyId: 1, revokedAt: 1 });
refreshTokenSchema.index({ familyId: 1, revokedAt: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
