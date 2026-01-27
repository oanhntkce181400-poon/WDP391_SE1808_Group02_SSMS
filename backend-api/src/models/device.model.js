const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    deviceCode: { type: String, required: true, unique: true, trim: true },
    deviceName: { type: String, required: true, trim: true },
    status: { type: String, enum: ['available', 'in-use', 'maintenance'], default: 'available' },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  },
  { timestamps: true },
);

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
