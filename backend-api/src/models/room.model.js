const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, unique: true, trim: true },
    roomName: { type: String, required: true, trim: true },
    roomType: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true },
  },
  { timestamps: true },
);

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
