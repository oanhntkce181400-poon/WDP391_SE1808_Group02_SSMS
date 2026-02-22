/**
 * Fix: Update ClassEnrollment status from 'enrolled' to 'active'
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Load models
require('./src/models/user.model');
require('./src/models/classEnrollment.model');

async function fixEnrollmentStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User');
    const ClassEnrollment = mongoose.model('ClassEnrollment');

    // Get student user
    const studentUser = await User.findOne({ email: 'student@test.com' });
    const userId = studentUser._id;

    console.log('👤 Student User ID:', userId.toString());
    console.log('');

    // Find and update enrollments
    const result = await ClassEnrollment.updateMany(
      {
        student: userId,
        status: 'enrolled'
      },
      {
        $set: { status: 'active' }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} enrollments from 'enrolled' to 'active'\n`);

    // Verify
    const enrollments = await ClassEnrollment.find({
      student: userId,
    }).populate('classSection', 'classCode');

    console.log(`📋 Final enrollment statuses:`);
    enrollments.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.classSection.classCode} - Status: ${e.status}`);
    });

    console.log('\n✅ ALL FIXED!');
    console.log('Now refresh the browser to see classes appear in Feedback page!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixEnrollmentStatus();
