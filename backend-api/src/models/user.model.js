const mongoose = require('mongoose');
const { VALID_USER_ROLES, normalizeRole } = require('../utils/role.util');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String },
    fullName: { type: String, required: true, trim: true },
    authProvider: {
      type: String,
      enum: ['google', 'local'],
      default: 'google',
      index: true,
    },
    mustChangePassword: { type: Boolean, default: false },
    googleId: { type: String, unique: true, sparse: true, trim: true },
    avatarUrl: { type: String, trim: true },
    avatarCloudinaryId: { type: String, trim: true },
    role: {
      type: String,
      enum: VALID_USER_ROLES,
      default: 'student',
      set: (value) => normalizeRole(value, 'student'),
    },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blocked', 'pending'],
      default: 'active',
      index: true,
    },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    importSource: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ authProvider: 1, status: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
