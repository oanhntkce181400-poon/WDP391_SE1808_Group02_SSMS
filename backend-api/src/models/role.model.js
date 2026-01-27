const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    roleCode: { type: String, required: true, unique: true, trim: true },
    roleName: { type: String, required: true, trim: true },
    isSystemRole: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    description: { type: String, trim: true },
  },
  { timestamps: true },
);

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
