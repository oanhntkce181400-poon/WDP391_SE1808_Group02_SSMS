/**
 * Verify feedback submission should now work
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Load all models
require('./src/models/user.model');
require('./src/models/feedback.model');
require('./src/models/classSection.model');
require('./src/models/classEnrollment.model');
require('./src/models/subject.model');
require('./src/models/teacher.model');
require('./src/models/room.model');
require('./src/models/timeslot.model');

async function verifyCanSubmit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User');
    const Feedback = mongoose.model('Feedback');
    const ClassEnrollment = mongoose.model('ClassEnrollment');

    // Get student user
    const studentUser = await User.findOne({ email: 'student@test.com' });
    const userId = studentUser._id;

    console.log('👤 Student User:', studentUser.email);
    console.log('');

    // Get first enrollment
    const enrollment = await ClassEnrollment.findOne({
      student: userId,
    }).populate('classSection', 'classCode');

    const classId = enrollment.classSection._id;
    const className = enrollment.classSection.classCode;

    console.log('📚 Testing class:', className);
    console.log('');

    // Check for blocking feedback
    const blockingFeedback = await Feedback.findOne({
      classSection: classId,
      submittedBy: userId,
      isAnonymous: false
    });

    console.log('🔍 Checking for blocking feedback...');
    if (blockingFeedback) {
      console.log('❌ FOUND blocking feedback! Student cannot submit new feedback.');
      console.log('   Feedback ID:', blockingFeedback._id);
    } else {
      console.log('✅ No blocking feedback found!');
    }

    console.log('');

    // Check how many feedbacks exist for this class (for display)
    const existingFeedbacks = await Feedback.find({
      classSection: classId,
    });

    console.log(`📊 Feedbacks for ${className}: ${existingFeedbacks.length}`);
    existingFeedbacks.forEach((fb, i) => {
      const submitterInfo = fb.submittedBy ? 'from student' : 'anonymous';
      console.log(`   ${i + 1}. ${fb.rating}⭐ (${submitterInfo}) - ${fb.comment.substring(0, 40)}...`);
    });

    console.log('');
    if (!blockingFeedback) {
      console.log('✅✅✅ READY! Student can now submit feedback!');
      console.log('\nRefresh the browser and try submitting feedback again.');
    } else {
      console.log('⚠️  Student still cannot submit. Please delete the blocking feedback.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyCanSubmit();
