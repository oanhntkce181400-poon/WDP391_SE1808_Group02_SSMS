const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    teacherCode: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, trim: true },
    department: { type: String, required: true, trim: true },
    specialization: { type: String, trim: true },
    degree: {
      type: String,
      enum: ["bachelors", "masters", "phd", "professor"],
      default: "bachelors",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    avatarUrl: { type: String, trim: true },
    // Link to User account (login account for the teacher)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

teacherSchema.index({ department: 1 });
teacherSchema.index({ isActive: 1 });

const Teacher = mongoose.model("Teacher", teacherSchema);

module.exports = Teacher;
