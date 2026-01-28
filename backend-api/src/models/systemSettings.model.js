const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    schoolName: { type: String, default: 'SSMS - School Management System' },
    schoolCode: { type: String, default: 'SSMS' },
    logoUrl: { type: String, default: '' },
    logoCloudinaryId: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    address: { type: String, default: '' },
    website: { type: String, default: '' },
    description: { type: String, default: '' },
    primaryColor: { type: String, default: '#1A237E' },
    secondaryColor: { type: String, default: '#42A5F5' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

module.exports = SystemSettings;
