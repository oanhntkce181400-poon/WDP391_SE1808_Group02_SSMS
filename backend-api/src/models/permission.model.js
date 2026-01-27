const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    permCode: { type: String, required: true, unique: true, trim: true },
    permName: { type: String, required: true, trim: true },
    module: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

permissionSchema.index({ module: 1, action: 1 });

const Permission = mongoose.model('Permission', permissionSchema);

module.exports = Permission;
