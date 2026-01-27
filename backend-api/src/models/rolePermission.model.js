const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema(
  {
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    permission: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

rolePermissionSchema.index({ role: 1, permission: 1 }, { unique: true });

const RolePermission = mongoose.model('RolePermission', rolePermissionSchema);

module.exports = RolePermission;

