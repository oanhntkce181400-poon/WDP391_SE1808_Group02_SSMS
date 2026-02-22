/**
 * Verify enrollment status fix
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Load all models properly
require('./src/models/user.model');
require('./src/models/classSection.model');
require('./src/models/subject.model');
require('./src/models/teacher.model');
require('./src/models/room.model');
require('./src/models/timeslot.model');
require('./src/models/classEnrollment.model');

async function verifyFix() {
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

    // Check enrollments with correct filter (as API uses)
    const enrollments = await ClassEnrollment.find({
      student: userId,
      status: { $in: ['active', 'completed'] }
    }).populate('classSection', 'classCode className');

    console.log(`✅ Enrollments found with ['active', 'completed'] status: ${enrollments.length}\n`);
    
    enrollments.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.classSection.classCode} - ${e.classSection.className}`);
    });

    if (enrollments.length > 0) {
      console.log('\n✅✅✅ FIXED! Classes should now appear in Feedback page!');
    } else {
      console.log('\n❌ Still no classes found. Checking all enrollments...');
      const all = await ClassEnrollment.find({ student: userId });
      console.log(`Total enrollments: ${all.length}`);
      all.forEach((e, i) => {
        console.log(`  ${i + 1}. Status: ${e.status}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyFix();
