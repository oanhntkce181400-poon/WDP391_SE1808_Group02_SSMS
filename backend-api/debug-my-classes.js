/**
 * Debug: Check what /classes/my-classes endpoint returns
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Load all models
require('./src/models/user.model');
require('./src/models/student.model');
require('./src/models/classSection.model');
require('./src/models/classEnrollment.model');
require('./src/models/subject.model');
require('./src/models/teacher.model');
require('./src/models/room.model');
require('./src/models/timeslot.model');

async function debugMyClasses() {
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

    // Check ClassEnrollments query - exactly as API does it
    console.log('🔍 Checking ClassEnrollment query...\n');

    const enrollments = await ClassEnrollment.find({
      student: userId,
      status: { $in: ['active', 'completed'] }
    }).populate('classSection');

    console.log(`Enrollments with status in ['active', 'completed']: ${enrollments.length}`);
    enrollments.forEach((e, i) => {
      console.log(`  ${i + 1}. Student: ${e.student}, Class: ${e.classSection.classCode}, Status: ${e.status}`);
    });

    console.log('');

    // Check ALL enrollments
    const allEnrollments = await ClassEnrollment.find({
      student: userId,
    }).populate('classSection');

    console.log(`Total enrollments (any status): ${allEnrollments.length}`);
    allEnrollments.forEach((e, i) => {
      console.log(`  ${i + 1}. Student: ${e.student}, Class: ${e.classSection.classCode}, Status: ${e.status}`);
    });

    console.log('\n');

    // Check enrolled status
    const enrolledOnly = await ClassEnrollment.find({
      student: userId,
      status: 'enrolled'
    }).populate('classSection');

    console.log(`Enrollments with status='enrolled': ${enrolledOnly.length}`);
    enrolledOnly.forEach((e, i) => {
      console.log(`  ${i + 1}. Class: ${e.classSection.classCode}`);
    });

    if (enrollments.length === 0 && enrolledOnly.length > 0) {
      console.log('\n⚠️  PROBLEM FOUND!');
      console.log('   ClassEnrollments have status="enrolled" but API filters for ["active", "completed"]');
      console.log('   Need to update enrollment status to "active" or change API filter');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugMyClasses();
