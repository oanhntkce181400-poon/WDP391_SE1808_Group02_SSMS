const mongoose = require('mongoose');

const paymentReminderSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  semester: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Semester' 
  },
  reminderType: { 
    type: String, 
    enum: ['email', 'sms', 'inapp', 'all'], 
    default: 'all' 
  },
  template: { type: String, default: 'default' },
  customMessage: { type: String },
  sentBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  sentAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'failed', 'skipped'], 
    default: 'pending' 
  },
  errorMessage: { type: String },
  results: {
    email: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'] },
    sms: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'] },
    inapp: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'] }
  }
}, { timestamps: true });

// Index for preventing duplicate reminders
paymentReminderSchema.index({ student: 1, sentAt: -1 });
paymentReminderSchema.index({ sentBy: 1, sentAt: -1 });

module.exports = mongoose.model('PaymentReminder', paymentReminderSchema);
