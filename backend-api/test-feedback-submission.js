/**
 * Debug: Test feedback submission
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Load all models
require('./src/models/user.model');
require('./src/models/student.model');
require('./src/models/classSection.model');
require('./src/models/subject.model');
require('./src/models/teacher.model');
require('./src/models/room.model');
require('./src/models/timeslot.model');
require('./src/models/classEnrollment.model');
require('./src/models/feedback.model');

async function testFeedbackSubmission() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User');
    const ClassEnrollment = mongoose.model('ClassEnrollment');
    const Feedback = mongoose.model('Feedback');
    const ClassSection = mongoose.model('ClassSection');

    // Get student user
    const studentUser = await User.findOne({ email: 'student@test.com' });
    const userId = studentUser._id;

    console.log('👤 Student User:', studentUser.email, '- ID:', userId.toString());
    console.log('');

    // Get first enrollment
    const enrollment = await ClassEnrollment.findOne({
      student: userId,
    }).populate('classSection', 'classCode _id');

    console.log('📚 First Enrollment:');
    console.log('   Class ID:', enrollment.classSection._id.toString());
    console.log('   Class Code:', enrollment.classSection.classCode);
    console.log('   Enrollment Status:', enrollment.status);
    console.log('');

    const classId = enrollment.classSection._id;

    // Try to create feedback
    console.log('🧪 Testing feedback creation...\n');

    try {
      const feedback = new Feedback({
        classSection: classId,
        submittedBy: userId,
        isAnonymous: false,
        rating: 4,
        comment: 'Test feedback - debug submission',
        criteria: {
          teachingQuality: 4,
          courseContent: 4,
          classEnvironment: 4,
          materialQuality: 4
        },
        status: 'pending'
      });

      await feedback.save();
      console.log('✅ Feedback created successfully!');
      console.log('   Feedback ID:', feedback._id);
      console.log('   Status:', feedback.status);
    } catch (error) {
      console.log('❌ Error creating feedback:', error.message);
    }

    console.log('\n');

    // Check enrollment status filter
    console.log('🔍 Checking enrollment validation...\n');
    
    const validEnrollment = await ClassEnrollment.findOne({
      student: userId,
      classSection: classId,
      status: { $in: ['enrolled', 'active'] }
    });

    if (validEnrollment) {
      console.log('✅ Enrollment validation PASSED');
      console.log('   Status:', validEnrollment.status);
    } else {
      console.log('❌ Enrollment validation FAILED!');
      console.log('   Expected status: "enrolled" or "active"');
      console.log('   Actual status:', enrollment.status);
      
      // Fix it
      console.log('\n📝 Updating enrollment status...');
      enrollment.status = 'active';
      await enrollment.save();
      console.log('✅ Enrollment status updated to "active"');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testFeedbackSubmission();
